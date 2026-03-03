from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from products.models import Category, Product


User = get_user_model()


class ProductApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Categories
        self.dairy = Category.objects.create(name="Dairy & Eggs")
        self.veg = Category.objects.create(name="Vegetables")

        # Users (assumes your custom User model has a 'role' field)
        self.producer1 = User.objects.create_user(username="p1", password="pass", role="producer")
        self.producer2 = User.objects.create_user(username="p2", password="pass", role="producer")
        self.customer = User.objects.create_user(username="c1", password="pass", role="customer")
        self.admin = User.objects.create_user(username="a1", password="pass", role="admin")

        today = date.today()

        # Publicly visible product
        self.public_product = Product.objects.create(
            sku="EGG-001",
            name="Eggs",
            description="Fresh local eggs",
            price=Decimal("3.50"),
            unit="dozen",
            stock_quantity=10,
            low_stock_threshold=5,
            is_available=True,
            allergens="Eggs",
            organic_certified=False,
            harvest_date=today,
            producer=self.producer1,
            category=self.dairy,
        )

        # Hidden: unavailable
        self.unavailable = Product.objects.create(
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
            producer=self.producer1,
            category=self.dairy,
        )

        # Hidden: out of stock
        self.out_of_stock = Product.objects.create(
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
            producer=self.producer1,
            category=self.dairy,
        )

        # Hidden: out of season (available_from in the future)
        self.out_of_season = Product.objects.create(
            sku="ASP-001",
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
            producer=self.producer1,
            category=self.veg,
        )

        # Organic visible product (for filter tests)
        self.organic_visible = Product.objects.create(
            sku="CAR-ORG",
            name="Organic Carrots",
            description="Organic carrots",
            price=Decimal("2.20"),
            unit="kg",
            stock_quantity=12,
            low_stock_threshold=5,
            is_available=True,
            allergens="",
            organic_certified=True,
            harvest_date=today,
            producer=self.producer2,
            category=self.veg,
        )

    def _ids(self, response):
        return [item["id"] for item in response.json()]

    # ---------- Public browsing rules ----------

    def test_public_list_shows_only_orderable(self):
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)

        self.assertIn(self.public_product.id, ids)
        self.assertIn(self.organic_visible.id, ids)

        self.assertNotIn(self.unavailable.id, ids)
        self.assertNotIn(self.out_of_stock.id, ids)
        self.assertNotIn(self.out_of_season.id, ids)

    def test_public_category_filter(self):
        res = self.client.get(f"/api/products/?category={self.dairy.id}")
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)

        # Only the public dairy product should be visible
        self.assertIn(self.public_product.id, ids)
        self.assertNotIn(self.organic_visible.id, ids)

    def test_public_search_filter(self):
        res = self.client.get("/api/products/?search=EGG-001")
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)
        self.assertIn(self.public_product.id, ids)

    def test_public_organic_filter(self):
        res = self.client.get("/api/products/?organic=true")
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)

        self.assertIn(self.organic_visible.id, ids)
        self.assertNotIn(self.public_product.id, ids)

    # ---------- Producer visibility rules ----------

    def test_producer_sees_own_hidden_products(self):
        self.client.force_authenticate(user=self.producer1)
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, 200)
        ids = self._ids(res)

        # Producer1 sees public + their own hidden items
        self.assertIn(self.public_product.id, ids)
        self.assertIn(self.unavailable.id, ids)
        self.assertIn(self.out_of_stock.id, ids)
        self.assertIn(self.out_of_season.id, ids)

        # Producer1 should also see other producers' public items
        self.assertIn(self.organic_visible.id, ids)

    # ---------- Detail endpoint rules ----------

    def test_public_detail_hides_non_orderable(self):
        res = self.client.get(f"/api/products/{self.unavailable.id}/")
        self.assertEqual(res.status_code, 404)

    def test_owner_producer_can_view_hidden_detail(self):
        self.client.force_authenticate(user=self.producer1)
        res = self.client.get(f"/api/products/{self.unavailable.id}/")
        self.assertEqual(res.status_code, 200)

    def test_admin_can_view_hidden_detail(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/products/{self.unavailable.id}/")
        self.assertEqual(res.status_code, 200)

    # ---------- Producer create + inventory updates ----------

    def test_producer_can_create_product(self):
        self.client.force_authenticate(user=self.producer1)
        payload = {
            "sku": "CHS-001",
            "name": "Cheese",
            "description": "Cheddar block",
            "price": "4.20",
            "unit": "block",
            "stock_quantity": 5,
            "low_stock_threshold": 2,
            "is_available": True,
            "allergens": "Milk",
            "organic_certified": True,
            "harvest_date": str(date.today()),
            "category": self.dairy.id,
        }
        res = self.client.post("/api/products/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["name"], "Cheese")

    def test_negative_stock_rejected_on_inventory_update(self):
        self.client.force_authenticate(user=self.producer1)
        res = self.client.patch(
            f"/api/products/{self.public_product.id}/inventory/",
            {"stock_quantity": -1},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_other_producer_cannot_update_inventory(self):
        self.client.force_authenticate(user=self.producer2)
        res = self.client.patch(
            f"/api/products/{self.public_product.id}/inventory/",
            {"stock_quantity": 3},
            format="json",
        )
        self.assertEqual(res.status_code, 403)