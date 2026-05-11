from django.apps import apps
from django.utils import timezone
from django.core.files.base import ContentFile
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
import requests
import os

# =========================
# Helpers
# =========================
def get_model(app_label, model_name):
    try:
        return apps.get_model(app_label, model_name)
    except Exception:
        return None

def set_if_exists(obj, field_name, value):
    if hasattr(obj, field_name):
        try:
            setattr(obj, field_name, value)
        except Exception:
            pass

def field_names(model):
    return {f.name for f in model._meta.get_fields()}

User = get_model("accounts", "User")
ProducerProfile = get_model("accounts", "ProducerProfile")
Category = get_model("products", "Category")
Product = get_model("products", "Product")
ProductInteraction = get_model("ai_service", "ProductInteraction")
Order = get_model("orders", "Order")
Settlement = get_model("payments", "Settlement")

if not all([User, Category, Product]):
    raise Exception("Required models not found. Need accounts.User, products.Category, products.Product")

today = timezone.localdate()

# =========================
# User creation
# =========================
def create_or_update_user(email, password, first_name, last_name, role, extra=None):
    extra = extra or {}
    user = User.objects.filter(email=email).first()

    if not user:
        try:
            user = User.objects.create_user(email=email, password=password)
        except Exception:
            user = User(email=email)
            if "username" in field_names(User):
                user.username = email
            user.set_password(password)

    # core fields
    if "email" in field_names(User):
        user.email = email
    if "first_name" in field_names(User):
        user.first_name = first_name
    if "last_name" in field_names(User):
        user.last_name = last_name
    if "role" in field_names(User):
        user.role = role
    if "is_active" in field_names(User):
        user.is_active = True
    if "username" in field_names(User) and not getattr(user, "username", None):
        user.username = email

    # optional flags
    if role == "admin":
        if "is_staff" in field_names(User):
            user.is_staff = True
        if "is_superuser" in field_names(User):
            user.is_superuser = True

    # optional extra fields
    for k, v in extra.items():
        if k in field_names(User):
            setattr(user, k, v)

    user.set_password(password)
    user.save()

    # Producer profile if available
    if role == "producer" and ProducerProfile:
        profile = ProducerProfile.objects.filter(user=user).first()
        if not profile:
            profile = ProducerProfile(user=user)

        pf = field_names(ProducerProfile)
        if "store_name" in pf and not getattr(profile, "store_name", ""):
            profile.store_name = f"{first_name} {last_name} Farm"
        if "store_description" in pf and not getattr(profile, "store_description", ""):
            profile.store_description = "AI demo producer profile"
        if "store_contact" in pf and not getattr(profile, "store_contact", ""):
            profile.store_contact = "0117 900 1234"
        if "store_address" in pf and not getattr(profile, "store_address", ""):
            profile.store_address = "Bristol, UK"
        profile.save()

    return user

admin = create_or_update_user(
    "admin@test.com", "Aaaaa11111", "System", "Admin", "admin"
)

jane = create_or_update_user(
    "jane.smith@bristolvalleyfarm.com",
    "Aaaaa11111",
    "Jane",
    "Smith",
    "producer",
    extra={"postcode": "BS1 4DJ"}
)

producer_a = create_or_update_user(
    "producerA@mail.com",
    "Aaaaa11111",
    "Producer",
    "A",
    "producer",
    extra={"postcode": "BS5 9AB"}
)

customer1 = create_or_update_user(
    "robert.johnson@email.com",
    "Aaaaa11111",
    "Robert",
    "Johnson",
    "customer",
    extra={"postcode": "BS1 5JG"}
)

customer2 = create_or_update_user(
    "emily.carter@email.com",
    "Aaaaa11111",
    "Emily",
    "Carter",
    "customer",
    extra={"postcode": "BS7 8LL"}
)

print("Users ready.")

# =========================
# Categories
# =========================
category_map = {}
for cat_name in ["Fruit", "Vegetables"]:
    obj, _ = Category.objects.get_or_create(name=cat_name)
    category_map[cat_name] = obj

# =========================
# Image helpers
# =========================
def image_candidates(query, lock_number):
    q = query.replace(" ", ",")
    return [
        f"https://loremflickr.com/800/600/{q}?lock={lock_number}",
        f"https://source.unsplash.com/800x600/?{q}",
    ]

def attach_image(product, query, lock_number):
    pf = field_names(Product)

    # If there is a URL-like field, save a usable URL
    url_field = None
    for candidate in ["image_url", "photo_url", "thumbnail_url"]:
        if candidate in pf:
            url_field = candidate
            break

    urls = image_candidates(query, lock_number)

    if url_field:
        setattr(product, url_field, urls[0])
        product.save(update_fields=[url_field])

    # If there is an ImageField-like field called image, try downloading locally
    if "image" in pf:
        for idx, url in enumerate(urls):
            try:
                r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200 and r.content:
                    filename = f"{product.name.lower().replace(' ', '_').replace('/', '_')}_{idx+1}.jpg"
                    product.image.save(filename, ContentFile(r.content), save=True)
                    print(f"Downloaded image for: {product.name}")
                    return
            except Exception:
                continue
        print(f"Could not download image for: {product.name}")
    else:
        print(f"No ImageField on Product; URL saved if field exists for: {product.name}")

# =========================
# Product creation
# =========================
product_specs = [
    # Apple variations
    {
        "name": "Fresh Apple - Grade A candidate",
        "query": "fresh red apple fruit",
        "producer": jane,
        "category": "Fruit",
        "description": "Healthy apple for AI quality demo - good / fresh example.",
        "price": "1.80",
        "unit": "each",
        "stock": 30,
        "grade": "good",
    },
    {
        "name": "Bruised Apple - Grade B candidate",
        "query": "bruised apple fruit",
        "producer": jane,
        "category": "Fruit",
        "description": "Slightly bruised apple for AI quality demo - borderline / ok example.",
        "price": "1.20",
        "unit": "each",
        "stock": 20,
        "grade": "ok",
    },
    {
        "name": "Rotten Apple - Grade C candidate",
        "query": "rotten apple fruit",
        "producer": jane,
        "category": "Fruit",
        "description": "Clearly rotten apple for AI quality demo - bad example.",
        "price": "0.40",
        "unit": "each",
        "stock": 12,
        "grade": "bad",
    },

    # Banana variations
    {
        "name": "Fresh Banana - Grade A candidate",
        "query": "fresh yellow banana fruit",
        "producer": producer_a,
        "category": "Fruit",
        "description": "Healthy banana for AI quality demo - good / fresh example.",
        "price": "1.50",
        "unit": "each",
        "stock": 28,
        "grade": "good",
    },
    {
        "name": "Overripe Banana - Grade B candidate",
        "query": "overripe banana spotted fruit",
        "producer": producer_a,
        "category": "Fruit",
        "description": "Overripe banana for AI quality demo - borderline / ok example.",
        "price": "1.00",
        "unit": "each",
        "stock": 18,
        "grade": "ok",
    },
    {
        "name": "Rotten Banana - Grade C candidate",
        "query": "rotten banana dark fruit",
        "producer": producer_a,
        "category": "Fruit",
        "description": "Clearly rotten banana for AI quality demo - bad example.",
        "price": "0.35",
        "unit": "each",
        "stock": 10,
        "grade": "bad",
    },

    # All other trained produce types
    {"name": "Fresh Orange", "query": "orange fruit", "producer": jane, "category": "Fruit", "description": "Fresh orange", "price": "2.20", "unit": "each", "stock": 25},
    {"name": "Fresh Mango", "query": "mango fruit", "producer": jane, "category": "Fruit", "description": "Fresh mango", "price": "3.50", "unit": "each", "stock": 16},
    {"name": "Fresh Strawberry", "query": "strawberry fruit", "producer": producer_a, "category": "Fruit", "description": "Fresh strawberries", "price": "2.80", "unit": "punnet", "stock": 20},
    {"name": "Fresh Bellpepper", "query": "bell pepper vegetable", "producer": producer_a, "category": "Vegetables", "description": "Fresh bellpepper", "price": "1.90", "unit": "each", "stock": 22},
    {"name": "Fresh Cucumber", "query": "cucumber vegetable", "producer": producer_a, "category": "Vegetables", "description": "Fresh cucumber", "price": "1.40", "unit": "each", "stock": 18},
    {"name": "Fresh Carrot", "query": "carrot vegetable", "producer": jane, "category": "Vegetables", "description": "Fresh carrot", "price": "1.60", "unit": "bunch", "stock": 24},
    {"name": "Fresh Potato", "query": "potato vegetable", "producer": jane, "category": "Vegetables", "description": "Fresh potato", "price": "2.00", "unit": "kg", "stock": 30},
    {"name": "Fresh Tomato", "query": "tomato vegetable", "producer": jane, "category": "Vegetables", "description": "Fresh tomato", "price": "2.30", "unit": "pack", "stock": 21},
    {"name": "Fresh Grape", "query": "grape fruit", "producer": producer_a, "category": "Fruit", "description": "Fresh grapes", "price": "2.60", "unit": "pack", "stock": 17},
    {"name": "Fresh Guava", "query": "guava fruit", "producer": producer_a, "category": "Fruit", "description": "Fresh guava", "price": "2.90", "unit": "each", "stock": 12},
    {"name": "Fresh Jujube", "query": "jujube fruit", "producer": producer_a, "category": "Fruit", "description": "Fresh jujube", "price": "3.10", "unit": "pack", "stock": 12},
    {"name": "Fresh Pomegranate", "query": "pomegranate fruit", "producer": producer_a, "category": "Fruit", "description": "Fresh pomegranate", "price": "3.20", "unit": "each", "stock": 14},
]

product_field_names = field_names(Product)
created_products = {}

for idx, spec in enumerate(product_specs, start=1):
    defaults = {}

    if "description" in product_field_names:
        defaults["description"] = spec["description"]
    if "price" in product_field_names:
        defaults["price"] = Decimal(spec["price"])
    if "unit" in product_field_names:
        defaults["unit"] = spec["unit"]
    if "stock_quantity" in product_field_names:
        defaults["stock_quantity"] = spec["stock"]
    if "is_available" in product_field_names:
        defaults["is_available"] = True
    if "available_from" in product_field_names:
        defaults["available_from"] = today - timedelta(days=2)
    if "available_to" in product_field_names:
        defaults["available_to"] = today + timedelta(days=90)
    if "harvest_date" in product_field_names:
        defaults["harvest_date"] = today
    if "category" in product_field_names:
        defaults["category"] = category_map[spec["category"]]
    if "farm_origin" in product_field_names:
        defaults["farm_origin"] = "Bristol, UK"
    if "food_miles" in product_field_names:
        defaults["food_miles"] = Decimal("4.5")
    if "organic_certified" in product_field_names:
        defaults["organic_certified"] = True
    if "allergens" in product_field_names:
        defaults["allergens"] = ""

    # Optional AI/demo fields if they exist
    if "quality_grade" in product_field_names:
        defaults["quality_grade"] = spec.get("grade", "good")
    if "grade" in product_field_names:
        defaults["grade"] = spec.get("grade", "good")
    if "quality_label" in product_field_names:
        defaults["quality_label"] = spec.get("grade", "good")

    obj, _ = Product.objects.update_or_create(
        name=spec["name"],
        producer=spec["producer"],
        defaults=defaults,
    )

    attach_image(obj, spec["query"], idx)
    created_products[spec["name"]] = obj
    print(f"Seeded product: {obj.name}")

print("All products created.")

# =========================
# Seed recommendation / reorder demo history
# =========================
try:
    from cart.services import CartService
    from orders.services import OrderService
    from payments.services import PaymentService

    def create_demo_order(customer, items, days_from_now=3, final_status="delivered"):
        CartService.clear_cart(customer)

        producer_ids = set()
        for product, qty in items:
            CartService.add_item(customer, product.id, qty)
            producer_ids.add(product.producer.id)

        producer_delivery_dates = {
            producer_id: today + timedelta(days=days_from_now)
            for producer_id in producer_ids
        }

        order = OrderService.create_order_from_cart(
            user=customer,
            delivery_address="45 Park Street, Bristol, BS1 5JG, Phone: 07700900123",
            producer_delivery_dates=producer_delivery_dates,
        )

        try:
            PaymentService.initiate_payment(order)
        except Exception as e:
            print(f"Payment creation warning for {order.order_number}: {e}")

        # update statuses
        for po in order.producer_orders.all():
            try:
                po.status = final_status
                po.save(update_fields=["status", "updated_at"])
            except Exception:
                po.status = final_status
                po.save()

        try:
            order.status = final_status
            order.save(update_fields=["status", "updated_at"])
        except Exception:
            order.status = final_status
            order.save()

        CartService.clear_cart(customer)
        print(f"Created demo order: {order.order_number} | status={order.status}")
        return order

    # Customer 1: enough history for quick reorder + recommendations
    create_demo_order(
        customer1,
        [
            (created_products["Fresh Apple - Grade A candidate"], 2),
            (created_products["Fresh Banana - Grade A candidate"], 2),
            (created_products["Fresh Orange"], 1),
        ],
        days_from_now=4,
        final_status="delivered",
    )

    create_demo_order(
        customer1,
        [
            (created_products["Bruised Apple - Grade B candidate"], 1),
            (created_products["Overripe Banana - Grade B candidate"], 1),
            (created_products["Fresh Grape"], 1),
            (created_products["Fresh Mango"], 1),
        ],
        days_from_now=6,
        final_status="delivered",
    )

    # Optional extra order across both producers
    create_demo_order(
        customer1,
        [
            (created_products["Fresh Apple - Grade A candidate"], 1),
            (created_products["Fresh Banana - Grade A candidate"], 1),
            (created_products["Fresh Carrot"], 1),
            (created_products["Fresh Pomegranate"], 1),
        ],
        days_from_now=8,
        final_status="confirmed",
    )

except Exception as e:
    print(f"Order/payment seeding skipped: {e}")

# =========================
# AI interactions
# =========================
if ProductInteraction:
    interaction_fields = field_names(ProductInteraction)

    def create_interaction(user, product, interaction_value):
        obj = ProductInteraction()

        if "user" in interaction_fields:
            obj.user = user
        elif "customer" in interaction_fields:
            obj.customer = user

        if "product" in interaction_fields:
            obj.product = product

        if "interaction_type" in interaction_fields:
            obj.interaction_type = interaction_value
        elif "action" in interaction_fields:
            obj.action = interaction_value
        elif "event_type" in interaction_fields:
            obj.event_type = interaction_value

        if "weight" in interaction_fields:
            obj.weight = 1.0
        if "score" in interaction_fields:
            obj.score = 1.0

        obj.save()

    # Customer 1: strong history
    for product_name in [
        "Fresh Apple - Grade A candidate",
        "Fresh Banana - Grade A candidate",
        "Bruised Apple - Grade B candidate",
        "Overripe Banana - Grade B candidate",
        "Fresh Mango",
        "Fresh Grape",
    ]:
        p = created_products[product_name]
        for action in ["view", "view", "add_to_cart", "purchase"]:
            try:
                create_interaction(customer1, p, action)
            except Exception:
                pass

    # Customer 2: minimal history / cold start
    try:
        create_interaction(customer2, created_products["Fresh Strawberry"], "view")
    except Exception:
        pass

    print("AI product interactions created.")
else:
    print("No ai_service.ProductInteraction model found - skipping interaction seeding.")

print("")
print("===== AI DEMO USERS =====")
print("Admin      -> admin@test.com / Aaaaa11111")
print("Producer 1 -> jane.smith@bristolvalleyfarm.com / Aaaaa11111")
print("Producer 2 -> producerA@mail.com / Aaaaa11111")
print("Customer 1 -> robert.johnson@email.com / Aaaaa11111")
print("Customer 2 -> emily.carter@email.com / Aaaaa11111")
print("")
print(f"Total products now in market: {Product.objects.count()}")
print("AI demo seed complete.")
