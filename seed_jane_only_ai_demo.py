from django.apps import apps
from django.utils import timezone
from django.core.files.base import ContentFile
from decimal import Decimal
from datetime import timedelta
import requests

def get_model(app, model):
    try:
        return apps.get_model(app, model)
    except Exception:
        return None

def field_names(model):
    return {f.name for f in model._meta.get_fields()}

def safe_delete(app, model):
    m = get_model(app, model)
    if not m:
        print(f"Skipped {app}.{model}")
        return
    count = m.objects.count()
    m.objects.all().delete()
    print(f"Deleted {count} from {app}.{model}")

# Clear dependent data first
for app, model in [
    ("ai_service", "QualityAssessment"),
    ("ai_service", "ProductInteraction"),
    ("ai_service", "RecommendationLog"),
    ("cart", "CartItem"),
    ("cart", "Cart"),
    ("payments", "Settlement"),
    ("payments", "Payment"),
    ("orders", "ProducerOrderItem"),
    ("orders", "OrderItem"),
    ("orders", "ProducerOrder"),
    ("orders", "Order"),
    ("reviews", "Review"),
    ("products", "Product"),
    ("products", "Category"),
]:
    safe_delete(app, model)

User = apps.get_model("accounts", "User")
Product = apps.get_model("products", "Product")
Category = apps.get_model("products", "Category")

today = timezone.localdate()
password = "Aaaaa11111"

# Make sure Jane exists as the only producer used for products
jane, _ = User.objects.get_or_create(
    email="jane.smith@bristolvalleyfarm.com",
    defaults={
        "username": "jane.smith@bristolvalleyfarm.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "role": "producer",
        "is_active": True,
    }
)

uf = field_names(User)

for k, v in {
    "username": "jane.smith@bristolvalleyfarm.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "producer",
    "is_active": True,
    "phone": "01179 123456",
    "phone_number": "01179 123456",
    "address": "Bristol Valley Farm, Bristol",
    "postcode": "BS1 4DJ",
}.items():
    if k in uf:
        setattr(jane, k, v)

jane.set_password(password)
jane.save()

# Optional customer for recommendation demo
customer, _ = User.objects.get_or_create(
    email="robert.johnson@email.com",
    defaults={
        "username": "robert.johnson@email.com",
        "first_name": "Robert",
        "last_name": "Johnson",
        "role": "customer",
        "is_active": True,
    }
)

for k, v in {
    "username": "robert.johnson@email.com",
    "first_name": "Robert",
    "last_name": "Johnson",
    "role": "customer",
    "is_active": True,
    "phone": "07700900123",
    "phone_number": "07700900123",
    "address": "45 Park Street, Bristol",
    "postcode": "BS1 5JG",
}.items():
    if k in uf:
        setattr(customer, k, v)

customer.set_password(password)
customer.save()

fruit, _ = Category.objects.get_or_create(name="Fruit")
veg, _ = Category.objects.get_or_create(name="Vegetables")

def download_image(product, url):
    pf = field_names(Product)

    if "image_url" in pf:
        product.image_url = url
        product.save(update_fields=["image_url"])

    if "image" not in pf:
        return

    try:
        response = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        if response.status_code == 200 and response.content:
            filename = product.name.lower().replace(" ", "_").replace("/", "_") + ".jpg"
            product.image.save(filename, ContentFile(response.content), save=True)
            print("Image saved:", product.name)
    except Exception as e:
        print("Image download skipped:", product.name, e)

def create_product(name, category, description, price, unit, stock, image_url):
    pf = field_names(Product)

    defaults = {}

    if "description" in pf:
        defaults["description"] = description
    if "price" in pf:
        defaults["price"] = Decimal(str(price))
    if "unit" in pf:
        defaults["unit"] = unit
    if "stock_quantity" in pf:
        defaults["stock_quantity"] = stock
    if "low_stock_threshold" in pf:
        defaults["low_stock_threshold"] = 5
    if "is_available" in pf:
        defaults["is_available"] = True
    if "available_from" in pf:
        defaults["available_from"] = today - timedelta(days=10)
    if "available_to" in pf:
        defaults["available_to"] = today + timedelta(days=120)
    if "harvest_date" in pf:
        defaults["harvest_date"] = today
    if "category" in pf:
        defaults["category"] = category
    if "producer" in pf:
        defaults["producer"] = jane
    if "farm_origin" in pf:
        defaults["farm_origin"] = "Bristol Valley Farm, BS1 4DJ"
    if "food_miles" in pf:
        defaults["food_miles"] = Decimal("1.20")
    if "organic_certified" in pf:
        defaults["organic_certified"] = True
    if "allergens" in pf:
        defaults["allergens"] = ""

    product, created = Product.objects.update_or_create(
        name=name,
        producer=jane,
        defaults=defaults,
    )

    download_image(product, image_url)

    print(("Created" if created else "Updated"), product.id, product.name, "->", jane.email)
    return product

products = [
    # Apple quality demo
    ("Fresh Apple - Grade A candidate", fruit, "Healthy fresh apple for Grade A AI demo.", "1.80", "each", 40, "https://commons.wikimedia.org/wiki/Special:FilePath/Red%20Apple.jpg"),
    ("Bruised Apple - Grade B candidate", fruit, "Slightly bruised apple for Grade B borderline AI demo.", "1.20", "each", 25, "https://commons.wikimedia.org/wiki/Special:FilePath/Bruised%20apple.jpg"),
    ("Rotten Apple - Grade C candidate", fruit, "Rotten apple for Grade C AI demo.", "0.40", "each", 10, "https://commons.wikimedia.org/wiki/Special:FilePath/Rotten%20apple.jpg"),

    # Banana quality demo
    ("Fresh Banana - Grade A candidate", fruit, "Healthy yellow banana for Grade A AI demo.", "1.50", "each", 40, "https://commons.wikimedia.org/wiki/Special:FilePath/Banana-Single.jpg"),
    ("Overripe Banana - Grade B candidate", fruit, "Spotted overripe banana for Grade B borderline AI demo.", "1.00", "each", 25, "https://commons.wikimedia.org/wiki/Special:FilePath/Overripe%20bananas.jpg"),
    ("Rotten Banana - Grade C candidate", fruit, "Dark rotten banana for Grade C AI demo.", "0.35", "each", 10, "https://commons.wikimedia.org/wiki/Special:FilePath/Rotten%20banana.jpg"),

    # Remaining trained produce types
    ("Fresh Orange", fruit, "Fresh orange.", "2.20", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Orange-Fruit-Pieces.jpg"),
    ("Fresh Mango", fruit, "Fresh mango.", "3.50", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Mangoes%20pic.jpg"),
    ("Fresh Strawberry", fruit, "Fresh strawberries.", "2.80", "punnet", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Strawberries.JPG"),
    ("Fresh Grape", fruit, "Fresh grapes.", "2.60", "pack", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Table%20grapes%20on%20white.jpg"),
    ("Fresh Guava", fruit, "Fresh guava.", "2.90", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Guava%20fruit.jpg"),
    ("Fresh Jujube", fruit, "Fresh jujube.", "3.10", "pack", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Jujube%20fruits.jpg"),
    ("Fresh Pomegranate", fruit, "Fresh pomegranate.", "3.20", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Pomegranate%20fruit.jpg"),

    ("Fresh Bellpepper", veg, "Fresh bell pepper.", "1.90", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Bell%20pepper.jpg"),
    ("Fresh Cucumber", veg, "Fresh cucumber.", "1.40", "each", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Cucumber%20vegetable.jpg"),
    ("Fresh Carrot", veg, "Fresh carrot.", "1.60", "bunch", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Carrots.JPG"),
    ("Fresh Potato", veg, "Fresh potato.", "2.00", "kg", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Potatoes.jpg"),
    ("Fresh Tomato", veg, "Fresh tomato.", "2.30", "pack", 30, "https://commons.wikimedia.org/wiki/Special:FilePath/Tomato%20je.jpg"),
]

created = {}
for item in products:
    p = create_product(*item)
    created[p.name] = p

# Create a little AI interaction history for recommendation demo
ProductInteraction = get_model("ai_service", "ProductInteraction")
if ProductInteraction:
    for product_name in [
        "Fresh Apple - Grade A candidate",
        "Fresh Banana - Grade A candidate",
        "Fresh Mango",
        "Fresh Grape",
    ]:
        p = created.get(product_name)
        if p:
            for action in ["viewed", "added_to_cart", "purchased"]:
                try:
                    ProductInteraction.log_interaction(
                        customer=customer,
                        product=p,
                        interaction_type=action,
                        quantity=1,
                    )
                except Exception:
                    pass
    print("AI interaction history created for Robert.")

print("")
print("DONE — all products now belong to Jane only.")
print("")
print("Producer login:")
print("jane.smith@bristolvalleyfarm.com / Aaaaa11111")
print("")
print("Optional customer login:")
print("robert.johnson@email.com / Aaaaa11111")
print("")
print("Product count:", Product.objects.count())
print("Jane product count:", Product.objects.filter(producer=jane).count())
