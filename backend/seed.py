import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from decimal import Decimal
from accounts.models import User, ProducerProfile
from products.models import Category, Product

# Clear existing data
Product.objects.all().delete()
Category.objects.all().delete()
ProducerProfile.objects.all().delete()
User.objects.all().delete()

# Create admin
admin = User.objects.create_superuser(
    email='admin@bristol.ac.uk', password='admin1234',
    first_name='Admin', last_name='User', is_active=True, role='admin'
)

# Create producers
p1 = User.objects.create_user(
    email='green@farm.co.uk', password='test1234',
    first_name='Green', last_name='Valley',
    is_producer=True, is_active=True, role='producer'
)
p1.producer_profile.store_name = 'Green Valley Farm'
p1.producer_profile.store_description = 'Organic vegetables and fruits grown in the heart of Somerset.'
p1.producer_profile.store_contact = 'green@farm.co.uk'
p1.producer_profile.farm_story = 'Family-run organic farm since 1985, committed to sustainable agriculture.'
p1.producer_profile.save()

p2 = User.objects.create_user(
    email='baker@artisan.co.uk', password='test1234',
    first_name='Artisan', last_name='Baker',
    is_producer=True, is_active=True, role='producer'
)
p2.producer_profile.store_name = 'Bristol Artisan Bakery'
p2.producer_profile.store_description = 'Handcrafted sourdough breads and pastries baked fresh daily.'
p2.producer_profile.store_contact = 'baker@artisan.co.uk'
p2.producer_profile.farm_story = 'Master bakers bringing traditional methods to modern Bristol.'
p2.producer_profile.save()

p3 = User.objects.create_user(
    email='dairy@meadow.co.uk', password='test1234',
    first_name='Meadow', last_name='Dairy',
    is_producer=True, is_active=True, role='producer'
)
p3.producer_profile.store_name = 'Meadow Dairy Co'
p3.producer_profile.store_description = 'Farm-fresh dairy products from free-range cows in the Cotswolds.'
p3.producer_profile.store_contact = 'dairy@meadow.co.uk'
p3.producer_profile.farm_story = 'Our cows graze freely on lush Cotswold pastures.'
p3.producer_profile.save()

p4 = User.objects.create_user(
    email='seafood@harbour.co.uk', password='test1234',
    first_name='Harbour', last_name='Fresh',
    is_producer=True, is_active=True, role='producer'
)
p4.producer_profile.store_name = 'Harbour Fresh Seafood'
p4.producer_profile.store_description = 'Fresh fish and seafood sourced daily from Bristol harbour.'
p4.producer_profile.store_contact = 'seafood@harbour.co.uk'
p4.producer_profile.farm_story = 'Sustainably sourced seafood straight from the Bristol Channel.'
p4.producer_profile.save()

p5 = User.objects.create_user(
    email='butcher@bristol.co.uk', password='test1234',
    first_name='Bristol', last_name='Butcher',
    is_producer=True, is_active=True, role='producer'
)
p5.producer_profile.store_name = 'Bristol Quality Meats'
p5.producer_profile.store_description = 'Premium locally reared meats from trusted West Country farms.'
p5.producer_profile.store_contact = 'butcher@bristol.co.uk'
p5.producer_profile.farm_story = 'Working with local farmers to bring you the finest West Country meats.'
p5.producer_profile.save()

# Create customer
c1 = User.objects.create_user(
    email='customer@test.com', password='test1234',
    first_name='Jane', last_name='Smith',
    is_active=True, role='customer', customer_role='individual'
)

# Create categories
veg = Category.objects.create(name='Vegetables')
fruit = Category.objects.create(name='Fruit')
bread = Category.objects.create(name='Bread & Bakery')
dairy = Category.objects.create(name='Dairy')
meat = Category.objects.create(name='Meat & Poultry')
seafood = Category.objects.create(name='Seafood')
pantry = Category.objects.create(name='Pantry & Staples')
drinks = Category.objects.create(name='Drinks')

# Create products with image mappings
products_data = [
    # Green Valley Farm - Vegetables & Fruit
    {'name': 'Organic Carrots', 'description': 'Freshly harvested organic carrots and mixed seasonal vegetables.', 'price': '2.50', 'unit': 'per kg', 'stock_quantity': 100, 'organic_certified': True, 'harvest_date': '2026-03-20', 'producer': p1, 'category': veg, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/10-ways-with-frozen-vegetables-iStock-182197343.jpg'},
    {'name': 'Heritage Tomatoes', 'description': 'Vine-ripened heritage tomatoes in mixed colours.', 'price': '3.75', 'unit': 'per kg', 'stock_quantity': 60, 'organic_certified': True, 'harvest_date': '2026-03-22', 'producer': p1, 'category': veg, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/tom-hermans-nM6qrtnVKn8-unsplash.jpg'},
    {'name': 'Fresh Spinach', 'description': 'Baby spinach leaves, perfect for salads and cooking.', 'price': '2.00', 'unit': 'per bag (200g)', 'stock_quantity': 80, 'organic_certified': True, 'harvest_date': '2026-03-23', 'producer': p1, 'category': veg, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/engin-akyurt-Y2xyssByhdc-unsplash.jpg'},
    {'name': 'Bramley Apples', 'description': 'Classic British cooking apples from our orchard.', 'price': '3.00', 'unit': 'per kg', 'stock_quantity': 150, 'organic_certified': False, 'harvest_date': '2026-03-18', 'producer': p1, 'category': fruit, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/matheus-cenali-wXuzS9xR49M-unsplash.jpg'},
    {'name': 'Avocados', 'description': 'Ripe and ready Hass avocados, perfect for guacamole.', 'price': '1.80', 'unit': 'each', 'stock_quantity': 70, 'organic_certified': True, 'harvest_date': '2026-03-21', 'producer': p1, 'category': fruit, 'farm_origin': 'Somerset, UK', 'food_miles': '30', 'image': 'products/gil-ndjouwou-cueV_oTVsic-unsplash.jpg'},

    # Bristol Artisan Bakery - Bread & Bakery
    {'name': 'Sourdough Loaf', 'description': 'Traditional sourdough bread with a perfect crust, slow-fermented for 24 hours.', 'price': '4.50', 'unit': 'per loaf', 'stock_quantity': 25, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p2, 'category': bread, 'farm_origin': 'Bristol, UK', 'food_miles': '0', 'image': 'products/debbie-widjaja-H_PXix_4Bwc-unsplash.jpg'},
    {'name': 'Croissants (4 pack)', 'description': 'Buttery, flaky croissants baked fresh every morning.', 'price': '6.00', 'unit': 'pack of 4', 'stock_quantity': 15, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p2, 'category': bread, 'farm_origin': 'Bristol, UK', 'food_miles': '0', 'image': 'products/conor-brown-sqkXyyj4WdE-unsplash.jpg'},
    {'name': 'Chocolate Muffins', 'description': 'Rich double chocolate muffins, freshly baked.', 'price': '5.50', 'unit': 'pack of 4', 'stock_quantity': 20, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p2, 'category': bread, 'farm_origin': 'Bristol, UK', 'food_miles': '0', 'image': 'products/shakti-rajpurohit-F6ajnawxySY-unsplash.jpg'},
    {'name': 'Artisan Pizza Base', 'description': 'Hand-stretched pizza base ready to top and bake.', 'price': '3.50', 'unit': 'each', 'stock_quantity': 18, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p2, 'category': bread, 'farm_origin': 'Bristol, UK', 'food_miles': '0', 'image': 'products/alan-hardman-SU1LFoeEUkk-unsplash.jpg'},

    # Meadow Dairy Co - Dairy & Pantry
    {'name': 'Whole Milk', 'description': 'Fresh whole milk from free-range cows.', 'price': '1.80', 'unit': 'per litre', 'stock_quantity': 50, 'organic_certified': True, 'harvest_date': '2026-03-23', 'producer': p3, 'category': dairy, 'farm_origin': 'Cotswolds, UK', 'food_miles': '40', 'image': 'products/no-revisions-8Ox_f0GKesw-unsplash.jpg'},
    {'name': 'Farmhouse Cheddar', 'description': 'Mature cheddar aged for 12 months.', 'price': '7.50', 'unit': 'per 300g block', 'stock_quantity': 35, 'organic_certified': False, 'harvest_date': '2026-03-15', 'producer': p3, 'category': dairy, 'farm_origin': 'Cotswolds, UK', 'food_miles': '40', 'image': 'products/david-foodphototasty-JJcT6VJWDlg-unsplash.jpg'},
    {'name': 'Free Range Eggs', 'description': 'Large free-range eggs from happy hens.', 'price': '3.50', 'unit': 'per dozen', 'stock_quantity': 45, 'organic_certified': True, 'harvest_date': '2026-03-23', 'producer': p3, 'category': dairy, 'farm_origin': 'Cotswolds, UK', 'food_miles': '40', 'image': 'products/katie-bernotsky-XT35Iz45mCQ-unsplash.jpg'},
    {'name': 'Natural Yoghurt', 'description': 'Thick, creamy natural yoghurt made from whole milk.', 'price': '2.80', 'unit': 'per 500g pot', 'stock_quantity': 30, 'organic_certified': True, 'harvest_date': '2026-03-22', 'producer': p3, 'category': dairy, 'farm_origin': 'Cotswolds, UK', 'food_miles': '40', 'image': 'products/nathan-dumlao-vZOZJH_xkUk-unsplash.jpg'},
    {'name': 'Vanilla Ice Cream', 'description': 'Handmade vanilla ice cream using our own fresh cream.', 'price': '5.00', 'unit': 'per 500ml tub', 'stock_quantity': 20, 'organic_certified': False, 'harvest_date': '2026-03-20', 'producer': p3, 'category': dairy, 'farm_origin': 'Cotswolds, UK', 'food_miles': '40', 'image': 'products/orissa-humes-_gN4PnJ3ygg-unsplash.jpg'},

    # Harbour Fresh Seafood
    {'name': 'Salmon Fillet', 'description': 'Fresh Atlantic salmon fillet, skin-on.', 'price': '8.50', 'unit': 'per 200g fillet', 'stock_quantity': 25, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p4, 'category': seafood, 'farm_origin': 'Bristol Channel, UK', 'food_miles': '10', 'image': 'products/sunorwind-yOSZ-MEWVuE-unsplash.jpg'},
    {'name': 'King Prawns', 'description': 'Fresh king prawns, shell-on, perfect for stir-fry or BBQ.', 'price': '9.00', 'unit': 'per 300g', 'stock_quantity': 20, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p4, 'category': seafood, 'farm_origin': 'Bristol Channel, UK', 'food_miles': '10', 'image': 'products/anthony-camp-Azobfog6Wu0-unsplash.jpg'},
    {'name': 'Grilled Tuna Steak', 'description': 'Premium ahi tuna steak, sashimi grade.', 'price': '12.00', 'unit': 'per 250g steak', 'stock_quantity': 15, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p4, 'category': seafood, 'farm_origin': 'Bristol Channel, UK', 'food_miles': '10', 'image': 'products/Grilled-Ahi-Tuna.jpg'},

    # Bristol Quality Meats
    {'name': 'Chicken Breast', 'description': 'Free-range chicken breast, skinless and boneless.', 'price': '6.50', 'unit': 'per 500g', 'stock_quantity': 30, 'organic_certified': True, 'harvest_date': '2026-03-23', 'producer': p5, 'category': meat, 'farm_origin': 'Somerset, UK', 'food_miles': '20', 'image': 'products/karyna-panchenko-z1HyKH0_IZo-unsplash.jpg'},
    {'name': 'Lamb Chops', 'description': 'Tender lamb chops from locally reared West Country lambs.', 'price': '11.00', 'unit': 'per 400g (2 chops)', 'stock_quantity': 18, 'organic_certified': False, 'harvest_date': '2026-03-22', 'producer': p5, 'category': meat, 'farm_origin': 'Somerset, UK', 'food_miles': '20', 'image': 'products/mayumi-maciel-5UkRSsJFxYw-unsplash.jpg'},
    {'name': 'Beef Mince', 'description': 'Lean beef mince from grass-fed cattle.', 'price': '5.50', 'unit': 'per 500g', 'stock_quantity': 25, 'organic_certified': False, 'harvest_date': '2026-03-23', 'producer': p5, 'category': meat, 'farm_origin': 'Somerset, UK', 'food_miles': '20', 'image': 'products/DSC_0523.jpg.webp'},

    # Pantry items (spread across producers)
    {'name': 'Extra Virgin Olive Oil', 'description': 'Cold-pressed extra virgin olive oil, perfect for dressing.', 'price': '8.00', 'unit': 'per 500ml bottle', 'stock_quantity': 40, 'organic_certified': True, 'harvest_date': '2026-03-01', 'producer': p1, 'category': pantry, 'farm_origin': 'Somerset, UK', 'food_miles': '30', 'image': 'products/roberta-sorge-uOBApnN_K7w-unsplash.jpg'},
    {'name': 'Fresh Pasta', 'description': 'Handmade fresh egg pasta, ready to cook in 3 minutes.', 'price': '3.50', 'unit': 'per 300g pack', 'stock_quantity': 25, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p2, 'category': pantry, 'farm_origin': 'Bristol, UK', 'food_miles': '0', 'image': 'products/heather-gill-SJ7uORconic-unsplash.jpg'},
    {'name': 'Basmati Rice', 'description': 'Premium long grain basmati rice.', 'price': '3.00', 'unit': 'per 1kg bag', 'stock_quantity': 50, 'organic_certified': True, 'harvest_date': '2026-03-10', 'producer': p1, 'category': pantry, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/pierre-bamin--LdilhDx3sk-unsplash.jpg'},

    # Drinks
    {'name': 'Fresh Orange Juice', 'description': 'Freshly squeezed orange juice, no added sugar.', 'price': '3.20', 'unit': 'per 500ml bottle', 'stock_quantity': 30, 'organic_certified': True, 'harvest_date': '2026-03-24', 'producer': p1, 'category': drinks, 'farm_origin': 'Somerset, UK', 'food_miles': '25', 'image': 'products/abhishek-hajare-kkrXVKK-jhg-unsplash.jpg'},
    {'name': 'Spring Water', 'description': 'Natural spring water from the Mendip Hills.', 'price': '1.00', 'unit': 'per 750ml bottle', 'stock_quantity': 100, 'organic_certified': False, 'harvest_date': '2026-03-24', 'producer': p3, 'category': drinks, 'farm_origin': 'Mendip Hills, UK', 'food_miles': '15', 'image': 'products/greg-rosenke-rJxh46Mf5ZQ-unsplash.jpg'},
]

for pd in products_data:
    pd['price'] = Decimal(pd['price'])
    if 'food_miles' in pd:
        pd['food_miles'] = Decimal(pd['food_miles'])
    Product.objects.create(**pd)

print(f"Created: {User.objects.count()} users, {ProducerProfile.objects.count()} profiles, {Category.objects.count()} categories, {Product.objects.count()} products")
print("Test accounts:")
print("  Admin:    admin@bristol.ac.uk / admin1234")
print("  Customer: customer@test.com / test1234")
print("  Producer: green@farm.co.uk / test1234")