from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from products.models import Category, Product

User = get_user_model()


class ProductApi70PlusTests(TestCase):
    """
    70+ quality: tests cover
    - public browsing rules (availability + stock + season)
    - filters (category, search, organic)
    - detail visibility rules (404 for hidden unless owner/admin)
    - producer-only actions (create + inventory update)
    - validation (negative stock, invalid season range, disallowed fields)
    - JWT token obtain (email-based login)
    """

    @classmethod
    def setUpTestData(cls):
        cls.client = APIClient()

        # Categories
        cls.dairy = Category.objects.create(name="Dairy")
        cls.fruit = Category.objects.create(name="Fruit")
        cls.veg = Category.objects.create(name="Vegetables")

        # Users (assumes accounts.User has "role" field)
        cls.producer1 = User.objects.create_user(
            username="p1", email="p1@test.com", password="pass", role="producer"
        )
        cls.producer2 = User.objects.create_user(
            username="p2", email="p2@test.com", password="pass", role="producer"
        )
        cls.customer = User.objects.create_user(
            username="c1", email="c1@test.com", password="pass", role="customer"
        )
        cls.admin = User.objects.create_user(
            username="a1", email="a1@test.com", password="pass", role="admin"
        )
        # Ensure accounts can authenticate in this project (some setups require verified/active)
        for u in [cls.producer1, cls.producer2, cls.customer, cls.admin]:
            if hasattr(u, "is_active"):
                u.is_active = True
            for flag in ["is_verified", "email_verified", "verified", "approved", "is_approved"]:
                 if hasattr(u, flag):
                    setattr(u, flag, True)
            u.save()

        today = date.today()

        # Visible (public)
        cls.eggs = Product.objects.create(
            sku="EGG-001",
            name="Eggs",
            description="Fresh eggs",
            price=Decimal("3.50"),
            unit="dozen",
            stock_quantity=10,
            low_stock_threshold=5,
            is_available=True,
            allergens="Eggs",
            organic_certified=False,
            harvest_date=today,
            producer=cls.producer1,
            category=cls.dairy,
        )

        # Hidden (unavailable)
        cls.milk_unavailable = Product.objects.create(
            sku="MLK-001",
            name="Milk",
            description="Whole milk",
            price=Decimal("2.00"),
            unit="litre",
            stock_quantity=10,
            low_stock_threshold=5,
            is_available=False,
            allergens="Milk",
            organic_certified=False,
            harvest_date=today,
            producer=cls.producer1,
            category=cls.dairy,
        )

        # Hidden (out of stock)
        cls.butter_oos = Product.objects.create(
            sku="BTR-001",
            name="Butter",
            description="Salted butter",
            price=Decimal("1.80"),
            unit="pack",
            stock_quantity=0,
            low_stock_threshold=5,
            is_available=True,
            allergens="Milk",
            organic_certified=False,
            harvest_date=today,
            producer=cls.producer1,
            category=cls.dairy,
        )

        # Hidden (out of season)
        cls.asparagus_future = Product.objects.create(
            sku="ASP-SEA",
            name="Asparagus",
            description="Seasonal asparagus",
            price=Decimal("4.00"),
            unit="bunch",
            stock_quantity=8,
            low_stock_threshold=5,
            is_available=True,
            available_from=today + timedelta(days=7),
            available_to=today + timedelta(days=21),
            allergens="",
            organic_certified=False,
            harvest_date=today,
            producer=cls.producer1,
            category=cls.veg,
        )

        # Visible organic product (other producer)
        cls.apples_org = Product.objects.create(
            sku="APL-ORG",
            name="Organic Apples",
            description="Organic apples",
            price=Decimal("2.90"),
            unit="kg",
            stock_quantity=25,
            low_stock_threshold=8,
            is_available=True,
            allergens="",
            organic_certified=True,
            harvest_date=today,
            producer=cls.producer2,
            category=cls.fruit,
        )

    def setUp(self):
        # fresh client per test (keeps auth clean)
        self.client = APIClient()

    def _ids(self, res):
        return [p["id"] for p in res.json()]

    # ---------- AUTH PROOF (JWT) ----------

    def test_jwt_token_obtain_pair_email_login(self):
        """
        Proves auth endpoint exists + accepts email+password and returns tokens.
        Endpoint is included as name='token_obtain_pair' in your URLconf.
        """
        url = reverse("token_obtain_pair")  # should resolve to /accounts/token/
        res = self.client.post(url, {"email": "p1@test.com", "password": "pass"}, format="json")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)

    # ---------- PUBLIC BROWSE RULES ----------

    def test_public_list_shows_only_orderable(self):
        url = reverse("products-list-create")
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)

        # visible
        self.assertIn(self.eggs.id, ids)
        self.assertIn(self.apples_org.id, ids)

        # hidden (unavailable / oos / out-of-season)
        self.assertNotIn(self.milk_unavailable.id, ids)
        self.assertNotIn(self.butter_oos.id, ids)
        self.assertNotIn(self.asparagus_future.id, ids)

    def test_categories_list_returns_sorted(self):
        url = reverse("product-categories")
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        names = [c["name"] for c in res.json()]
        self.assertEqual(names, sorted(names))

    # ---------- FILTERS ----------

    def test_filter_by_category(self):
        url = reverse("products-list-create")
        res = self.client.get(url, {"category": self.fruit.id})
        ids = self._ids(res)
        self.assertIn(self.apples_org.id, ids)
        self.assertNotIn(self.eggs.id, ids)

    def test_search_filter_matches_sku_or_name(self):
        url = reverse("products-list-create")

        res = self.client.get(url, {"search": "EGG-001"})
        self.assertIn(self.eggs.id, self._ids(res))

        res = self.client.get(url, {"search": "Apples"})
        self.assertIn(self.apples_org.id, self._ids(res))

    def test_organic_filter(self):
        url = reverse("products-list-create")
        res = self.client.get(url, {"organic": "true"})
        ids = self._ids(res)
        self.assertIn(self.apples_org.id, ids)
        self.assertNotIn(self.eggs.id, ids)

    # ---------- DETAIL VISIBILITY ----------

    def test_public_detail_hides_non_orderable(self):
        url = reverse("product-detail", kwargs={"product_id": self.milk_unavailable.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, 404)

    def test_owner_producer_can_view_hidden_detail(self):
        self.client.force_authenticate(user=self.producer1)
        url = reverse("product-detail", kwargs={"product_id": self.milk_unavailable.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

    def test_admin_can_view_hidden_detail(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("product-detail", kwargs={"product_id": self.milk_unavailable.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

    # ---------- PRODUCER ACTIONS + VALIDATION ----------

    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse("products-list-create")
        payload = {
            "sku": "X-001",
            "name": "Should Fail",
            "description": "Customers cannot create products",
            "price": "1.00",
            "unit": "unit",
            "stock_quantity": 5,
            "low_stock_threshold": 2,
            "is_available": True,
            "allergens": "",
            "organic_certified": False,
            "harvest_date": str(date.today()),
            "category": self.fruit.id,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, 403)

    def test_producer_can_create_product(self):
        self.client.force_authenticate(user=self.producer1)
        url = reverse("products-list-create")
        payload = {
            "sku": "BNNA-001",
            "name": "Bananas",
            "description": "Sweet bananas",
            "price": "1.20",
            "unit": "kg",
            "stock_quantity": 12,
            "low_stock_threshold": 4,
            "is_available": True,
            "allergens": "",
            "organic_certified": False,
            "harvest_date": str(date.today()),
            "category": self.fruit.id,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["sku"], "BNNA-001")

    def test_inventory_update_owner_only_and_negative_rejected(self):
        inv_url = reverse("product-inventory", kwargs={"product_id": self.eggs.id})

        # other producer blocked
        self.client.force_authenticate(user=self.producer2)
        res = self.client.patch(inv_url, {"stock_quantity": 5}, format="json")
        self.assertEqual(res.status_code, 403)

        # owner: negative rejected
        self.client.force_authenticate(user=self.producer1)
        res = self.client.patch(inv_url, {"stock_quantity": -1}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_inventory_update_rejects_disallowed_fields(self):
        inv_url = reverse("product-inventory", kwargs={"product_id": self.eggs.id})
        self.client.force_authenticate(user=self.producer1)

        # name shouldn't be allowed in inventory endpoint
        res = self.client.patch(inv_url, {"name": "Hacked Name"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_season_range_validation(self):
        self.client.force_authenticate(user=self.producer1)
        url = reverse("products-list-create")

        payload = {
            "sku": "BAD-SEA",
            "name": "Bad Season",
            "description": "Invalid season window",
            "price": "1.00",
            "unit": "unit",
            "stock_quantity": 5,
            "low_stock_threshold": 2,
            "is_available": True,
            "available_from": str(date.today() + timedelta(days=10)),
            "available_to": str(date.today() + timedelta(days=1)),  # invalid
            "allergens": "",
            "organic_certified": False,
            "harvest_date": str(date.today()),
            "category": self.veg.id,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, 400)