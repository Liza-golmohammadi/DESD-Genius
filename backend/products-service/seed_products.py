"""
Products-only seed script. Runs inside the products-service container.
Registers users in auth-service and uses real UUIDs for products.
Password for all test accounts: Bristol2026!
"""
import os, sys, django, uuid
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from products.models import Category, Product

# Clear
Product.objects.all().delete()
Category.objects.all().delete()

# Stable fake producer UUIDs (use real ones from auth-service if available)
PRODUCERS = {
    'p1': {'id': '00000000-0001-0001-0001-000000000001', 'name': 'Green Valley Farm'},
    'p2': {'id': '00000000-0001-0001-0001-000000000002', 'name': 'Bristol Artisan Bakery'},
    'p3': {'id': '00000000-0001-0001-0001-000000000003', 'name': 'Meadow Dairy Co'},
    'p4': {'id': '00000000-0001-0001-0001-000000000004', 'name': 'Harbour Fresh Seafood'},
    'p5': {'id': '00000000-0001-0001-0001-000000000005', 'name': 'Bristol Quality Meats'},
    'p6': {'id': '00000000-0001-0001-0001-000000000006', 'name': 'Wye Valley Orchard'},
    'p7': {'id': '00000000-0001-0001-0001-000000000007', 'name': 'Somerset Herb Garden'},
    'p8': {'id': '00000000-0001-0001-0001-000000000008', 'name': 'Mendip Hive & Preserves'},
    'p9': {'id': '00000000-0001-0001-0001-000000000009', 'name': 'Clifton Fine Cheese'},
    'p10': {'id': '00000000-0001-0001-0001-000000000010', 'name': 'Severn Cordial Co.'},
}

# Try to resolve real UUIDs from auth-service via HTTP
try:
    import requests
    AUTH_BASE = os.environ.get('AUTH_SERVICE_URL', 'http://auth-service:8000') + '/api/auth_service'
    producer_accounts = [
        ('p1', 'green@farm.co.uk', 'Bristol2026!', 'Green', 'Valley', 'Green Valley Farm'),
        ('p2', 'baker@artisan.co.uk', 'Bristol2026!', 'Artisan', 'Baker', 'Bristol Artisan Bakery'),
        ('p3', 'dairy@meadow.co.uk', 'Bristol2026!', 'Meadow', 'Dairy', 'Meadow Dairy Co'),
        ('p4', 'seafood@harbour.co.uk', 'Bristol2026!', 'Harbour', 'Fresh', 'Harbour Fresh Seafood'),
        ('p5', 'butcher@bristol.co.uk', 'Bristol2026!', 'Bristol', 'Butcher', 'Bristol Quality Meats'),
        ('p6', 'orchard@wyevalley.co.uk', 'Bristol2026!', 'Wye', 'Valley', 'Wye Valley Orchard'),
        ('p7', 'herbs@somersetgarden.co.uk', 'Bristol2026!', 'Somerset', 'Garden', 'Somerset Herb Garden'),
        ('p8', 'honey@mendiphive.co.uk', 'Bristol2026!', 'Mendip', 'Hive', 'Mendip Hive & Preserves'),
        ('p9', 'cheese@cliftoncreamery.co.uk', 'Bristol2026!', 'Clifton', 'Creamery', 'Clifton Fine Cheese'),
        ('p10', 'drinks@severncordial.co.uk', 'Bristol2026!', 'Severn', 'Cordial', 'Severn Cordial Co.'),
    ]

    # Register admin + customer
    requests.post(f'{AUTH_BASE}/register/customer/', json={
        'email': 'admin@bristol.ac.uk', 'password': 'Bristol2026!',
        'first_name': 'Admin', 'last_name': 'User',
        'accepted_terms': True, 'customer_role': 'individual',
    }, timeout=5)
    requests.post(f'{AUTH_BASE}/register/customer/', json={
        'email': 'customer@test.com', 'password': 'Bristol2026!',
        'first_name': 'Jane', 'last_name': 'Smith',
        'accepted_terms': True, 'customer_role': 'individual',
    }, timeout=5)

    for key, email, pw, fn, ln, store in producer_accounts:
        resp = requests.post(f'{AUTH_BASE}/register/producer/', json={
            'email': email, 'password': pw,
            'first_name': fn, 'last_name': ln,
            'accepted_terms': True, 'store_name': store,
        }, timeout=5)
        data = {}
        try:
            data = resp.json()
        except Exception:
            pass
        uid = data.get('id')
        if uid:
            PRODUCERS[key]['id'] = str(uid)
            print(f"  Registered {email} -> {uid}")
        else:
            # Try login to get id
            lr = requests.post(f'{AUTH_BASE}/token/', json={
                'email': email, 'password': pw,
            }, timeout=5)
            try:
                ld = lr.json()
                uid = ld.get('user', {}).get('id') or ld.get('id')
                if uid:
                    PRODUCERS[key]['id'] = str(uid)
                    print(f"  Logged in {email} -> {uid}")
                else:
                    print(f"  Could not resolve {email}, using placeholder UUID")
            except Exception:
                print(f"  Could not resolve {email}, using placeholder UUID")
except Exception as e:
    print(f"  Could not contact auth-service ({e}), using placeholder UUIDs")

def P(key):
    return PRODUCERS[key]['id'], PRODUCERS[key]['name']

# Categories
veg = Category.objects.create(name='Vegetables')
fruit = Category.objects.create(name='Fruit')
bread = Category.objects.create(name='Bread & Bakery')
dairy = Category.objects.create(name='Dairy')
meat = Category.objects.create(name='Meat & Poultry')
seafood = Category.objects.create(name='Seafood')
pantry = Category.objects.create(name='Pantry & Staples')
drinks = Category.objects.create(name='Drinks')
preserves = Category.objects.create(name='Preserves')

products_data = [
    # Green Valley Farm
    {'name':'Organic Carrots','description':'Freshly harvested organic carrots.','price':'2.50','unit':'per kg','stock_quantity':100,'organic_certified':True,'harvest_date':'2026-03-20','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':veg,'farm_origin':'Somerset, UK','food_miles':'25','image_url':'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&q=80'},
    {'name':'Heritage Tomatoes','description':'Vine-ripened heritage tomatoes in a riot of colours.','price':'3.75','unit':'per kg','stock_quantity':60,'organic_certified':True,'harvest_date':'2026-03-22','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':veg,'farm_origin':'Somerset, UK','food_miles':'25','image_url':'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80'},
    {'name':'Fresh Spinach','description':'Baby spinach leaves cut at their most tender.','price':'2.00','unit':'per bag (200g)','stock_quantity':80,'organic_certified':True,'harvest_date':'2026-03-23','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':veg,'farm_origin':'Somerset, UK','food_miles':'25','image_url':'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80'},
    {'name':'Bramley Apples','description':'Classic British cooking apples.','price':'3.00','unit':'per kg','stock_quantity':150,'organic_certified':False,'harvest_date':'2026-03-18','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':fruit,'farm_origin':'Somerset, UK','food_miles':'25','image_url':'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80'},
    {'name':'Seasonal Veg Box','description':'A hand-picked selection of the best from the farm.','price':'9.50','unit':'per box','stock_quantity':40,'organic_certified':True,'harvest_date':'2026-03-24','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':veg,'farm_origin':'Somerset, UK','food_miles':'25','image_url':'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80'},
    {'name':'Cold-Pressed Rapeseed Oil','description':'Single-estate cold-pressed rapeseed oil.','price':'6.50','unit':'per 500ml bottle','stock_quantity':40,'organic_certified':True,'harvest_date':'2026-03-01','allergens':'','producer_id':P('p1')[0],'producer_name':P('p1')[1],'category':pantry,'farm_origin':'Wiltshire, UK','food_miles':'35','image_url':'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80'},
    # Bristol Artisan Bakery
    {'name':'Sourdough Loaf','description':'Traditional sourdough bread slow-fermented 18 hours.','price':'4.50','unit':'per loaf','stock_quantity':25,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Gluten','producer_id':P('p2')[0],'producer_name':P('p2')[1],'category':bread,'farm_origin':'Stokes Croft, Bristol','food_miles':'2','image_url':'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'},
    {'name':'Croissants (4 pack)','description':'Buttery, flaky croissants baked fresh every morning.','price':'6.00','unit':'pack of 4','stock_quantity':15,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Gluten, Dairy, Eggs','producer_id':P('p2')[0],'producer_name':P('p2')[1],'category':bread,'farm_origin':'Stokes Croft, Bristol','food_miles':'2','image_url':'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80'},
    {'name':'Chocolate Muffins','description':'Rich double-chocolate muffins with molten centre.','price':'5.50','unit':'pack of 4','stock_quantity':20,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Gluten, Dairy, Eggs','producer_id':P('p2')[0],'producer_name':P('p2')[1],'category':bread,'farm_origin':'Stokes Croft, Bristol','food_miles':'2','image_url':'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&q=80'},
    {'name':'Fresh Egg Pasta','description':'Handmade fresh egg pasta rolled daily.','price':'3.50','unit':'per 300g pack','stock_quantity':25,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Gluten, Eggs','producer_id':P('p2')[0],'producer_name':P('p2')[1],'category':pantry,'farm_origin':'Stokes Croft, Bristol','food_miles':'2','image_url':'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&q=80'},
    # Meadow Dairy Co
    {'name':'Whole Milk','description':'Unhomogenised whole milk from Brown Swiss herd.','price':'1.80','unit':'per litre','stock_quantity':50,'organic_certified':True,'harvest_date':'2026-03-23','allergens':'Milk','producer_id':P('p3')[0],'producer_name':P('p3')[1],'category':dairy,'farm_origin':'Cotswolds, UK','food_miles':'40','image_url':'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80'},
    {'name':'Farmhouse Cheddar','description':'Cloth-bound cheddar aged 12 months.','price':'7.50','unit':'per 300g block','stock_quantity':35,'organic_certified':False,'harvest_date':'2026-03-15','allergens':'Milk','producer_id':P('p3')[0],'producer_name':P('p3')[1],'category':dairy,'farm_origin':'Cotswolds, UK','food_miles':'40','image_url':'https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?w=600&q=80'},
    {'name':'Free Range Eggs','description':'Large eggs from free-range Cotswold hens.','price':'3.50','unit':'per dozen','stock_quantity':45,'organic_certified':True,'harvest_date':'2026-03-23','allergens':'Eggs','producer_id':P('p3')[0],'producer_name':P('p3')[1],'category':dairy,'farm_origin':'Cotswolds, UK','food_miles':'40','image_url':'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&q=80'},
    {'name':'Natural Yoghurt','description':'Thick set yoghurt from whole milk and live culture.','price':'2.80','unit':'per 500g pot','stock_quantity':30,'organic_certified':True,'harvest_date':'2026-03-22','allergens':'Milk','producer_id':P('p3')[0],'producer_name':P('p3')[1],'category':dairy,'farm_origin':'Cotswolds, UK','food_miles':'40','image_url':'https://images.unsplash.com/photo-1505253304499-671c55fb57fe?w=600&q=80'},
    # Harbour Fresh Seafood
    {'name':'Sea Bass Fillet','description':'Line-caught sea bass from the Bristol Channel.','price':'9.50','unit':'per 200g fillet','stock_quantity':20,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Fish','producer_id':P('p4')[0],'producer_name':P('p4')[1],'category':seafood,'farm_origin':'Bristol Channel, UK','food_miles':'10','image_url':'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80'},
    {'name':'Whole Mackerel','description':'Firm mackerel caught by hand line.','price':'5.50','unit':'per fish','stock_quantity':25,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Fish','producer_id':P('p4')[0],'producer_name':P('p4')[1],'category':seafood,'farm_origin':'Bristol Channel, UK','food_miles':'10','image_url':'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=600&q=80'},
    {'name':'Fresh Crab Claws','description':'Pot-caught brown crab claws, cooked on the boat.','price':'12.00','unit':'per 400g pack','stock_quantity':15,'organic_certified':False,'harvest_date':'2026-03-24','allergens':'Crustaceans','producer_id':P('p4')[0],'producer_name':P('p4')[1],'category':seafood,'farm_origin':'Bristol Channel, UK','food_miles':'10','image_url':'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80'},
    # Bristol Quality Meats
    {'name':'Free-Range Chicken','description':'Whole free-range chicken slow-grown 81 days.','price':'12.00','unit':'per whole bird','stock_quantity':20,'organic_certified':True,'harvest_date':'2026-03-23','allergens':'','producer_id':P('p5')[0],'producer_name':P('p5')[1],'category':meat,'farm_origin':'Somerset, UK','food_miles':'20','image_url':'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&q=80'},
    {'name':'Dry-Aged Ribeye Steak','description':'28-day dry-aged ribeye from grass-fed beef.','price':'16.50','unit':'per 300g steak','stock_quantity':12,'organic_certified':False,'harvest_date':'2026-03-22','allergens':'','producer_id':P('p5')[0],'producer_name':P('p5')[1],'category':meat,'farm_origin':'Somerset, UK','food_miles':'20','image_url':'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80'},
    {'name':'Lamb Chops','description':'Tender lamb chops from herb-rich Somerset pasture.','price':'11.00','unit':'per 400g (2 chops)','stock_quantity':18,'organic_certified':False,'harvest_date':'2026-03-22','allergens':'','producer_id':P('p5')[0],'producer_name':P('p5')[1],'category':meat,'farm_origin':'Somerset, UK','food_miles':'20','image_url':'https://images.unsplash.com/photo-1529694157872-4e0c0f3b238b?w=600&q=80'},
    # Wye Valley Orchard
    {'name':"Cox's Orange Pippin Apples",'description':'Classic British dessert apple.','price':'2.80','unit':'per kg','stock_quantity':120,'organic_certified':True,'harvest_date':'2026-03-20','allergens':'','producer_id':P('p6')[0],'producer_name':P('p6')[1],'category':fruit,'farm_origin':'Monmouth, Wales','food_miles':'32','image_url':'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80'},
    {'name':'Williams Pears','description':'Buttery, honey-sweet heritage pears.','price':'3.20','unit':'per kg','stock_quantity':80,'organic_certified':True,'harvest_date':'2026-03-19','allergens':'','producer_id':P('p6')[0],'producer_name':P('p6')[1],'category':fruit,'farm_origin':'Monmouth, Wales','food_miles':'32','image_url':'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=600&q=80'},
    {'name':'Sweet Cherries','description':'Plump dark red cherries hand-picked at peak ripeness.','price':'4.80','unit':'per 400g punnet','stock_quantity':40,'organic_certified':True,'harvest_date':'2026-03-22','allergens':'','producer_id':P('p6')[0],'producer_name':P('p6')[1],'category':fruit,'farm_origin':'Monmouth, Wales','food_miles':'32','image_url':'https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=600&q=80'},
    {'name':'Fresh Apple Juice','description':'Cold-pressed Somerset apple juice.','price':'3.20','unit':'per 750ml bottle','stock_quantity':30,'organic_certified':True,'harvest_date':'2026-03-24','allergens':'','producer_id':P('p6')[0],'producer_name':P('p6')[1],'category':drinks,'farm_origin':'Monmouth, Wales','food_miles':'32','image_url':'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80'},
    # Somerset Herb Garden
    {'name':'Fresh Basil','description':'Large-leafed Genovese basil, cut to order.','price':'1.80','unit':'per bunch','stock_quantity':60,'organic_certified':True,'harvest_date':'2026-03-27','allergens':'','producer_id':P('p7')[0],'producer_name':P('p7')[1],'category':veg,'farm_origin':'Glastonbury, Somerset','food_miles':'28','image_url':'https://images.unsplash.com/photo-1618375535959-08f7f89c3a30?w=600&q=80'},
    {'name':'Rainbow Chard','description':'Striking stems of red, yellow, orange chard.','price':'2.20','unit':'per bunch','stock_quantity':50,'organic_certified':True,'harvest_date':'2026-03-26','allergens':'','producer_id':P('p7')[0],'producer_name':P('p7')[1],'category':veg,'farm_origin':'Glastonbury, Somerset','food_miles':'28','image_url':'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=600&q=80'},
    {'name':'Mixed Salad Leaves','description':'Restaurant-quality mix of 12+ varieties.','price':'2.50','unit':'per 150g bag','stock_quantity':70,'organic_certified':True,'harvest_date':'2026-03-27','allergens':'','producer_id':P('p7')[0],'producer_name':P('p7')[1],'category':veg,'farm_origin':'Glastonbury, Somerset','food_miles':'28','image_url':'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80'},
    {'name':'Purple Kale','description':'Deep purple kale, sweeter than green varieties.','price':'2.00','unit':'per bunch','stock_quantity':55,'organic_certified':True,'harvest_date':'2026-03-25','allergens':'','producer_id':P('p7')[0],'producer_name':P('p7')[1],'category':veg,'farm_origin':'Glastonbury, Somerset','food_miles':'28','image_url':'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=600&q=80'},
    # Mendip Hive & Preserves
    {'name':'Mendip Wildflower Honey','description':'Raw wildflower honey from Mendip meadows.','price':'7.50','unit':'per 340g jar','stock_quantity':45,'organic_certified':False,'harvest_date':'2026-02-10','allergens':'Honey','producer_id':P('p8')[0],'producer_name':P('p8')[1],'category':preserves,'farm_origin':'Cheddar, Somerset','food_miles':'18','image_url':'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80'},
    {'name':'Strawberry & Vanilla Jam','description':'Slow-cooked strawberry jam with vanilla bean.','price':'4.50','unit':'per 280g jar','stock_quantity':35,'organic_certified':False,'harvest_date':'2026-01-15','allergens':'','producer_id':P('p8')[0],'producer_name':P('p8')[1],'category':preserves,'farm_origin':'Cheddar, Somerset','food_miles':'18','image_url':'https://images.unsplash.com/photo-1490323815596-d9f9e19b37ca?w=600&q=80'},
    {'name':'Seville Orange Marmalade','description':'Thick-cut bitter-sweet marmalade.','price':'4.80','unit':'per 300g jar','stock_quantity':28,'organic_certified':False,'harvest_date':'2026-01-20','allergens':'','producer_id':P('p8')[0],'producer_name':P('p8')[1],'category':preserves,'farm_origin':'Cheddar, Somerset','food_miles':'18','image_url':'https://images.unsplash.com/photo-1605548230624-8d2d0419c664?w=600&q=80'},
    # Clifton Fine Cheese
    {'name':'Bristol Brie','description':'Soft bloomy-rind brie-style cheese.','price':'6.80','unit':'per 200g round','stock_quantity':20,'organic_certified':False,'harvest_date':'2026-03-18','allergens':'Milk','producer_id':P('p9')[0],'producer_name':P('p9')[1],'category':dairy,'farm_origin':'Clifton, Bristol','food_miles':'3','image_url':'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&q=80'},
    {'name':'Clifton Blue','description':'Bold buttery blue cheese with natural rind.','price':'8.50','unit':'per 250g wedge','stock_quantity':15,'organic_certified':False,'harvest_date':'2026-03-10','allergens':'Milk','producer_id':P('p9')[0],'producer_name':P('p9')[1],'category':dairy,'farm_origin':'Clifton, Bristol','food_miles':'3','image_url':'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&q=80'},
    {'name':'Smoked Applewood Cheddar','description':'Cold-smoked cheddar over applewood chips.','price':'7.00','unit':'per 250g block','stock_quantity':18,'organic_certified':False,'harvest_date':'2026-03-05','allergens':'Milk','producer_id':P('p9')[0],'producer_name':P('p9')[1],'category':dairy,'farm_origin':'Clifton, Bristol','food_miles':'3','image_url':'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=600&q=80'},
    # Severn Cordial Co.
    {'name':'Elderflower Cordial','description':'Foraged elderflower cordial from Wye Valley.','price':'5.50','unit':'per 500ml bottle','stock_quantity':40,'organic_certified':False,'harvest_date':'2025-06-12','allergens':'','producer_id':P('p10')[0],'producer_name':P('p10')[1],'category':drinks,'farm_origin':'Chepstow','food_miles':'22','image_url':'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&q=80'},
    {'name':'Apple & Ginger Juice','description':'Fresh-pressed apples with cold-pressed ginger.','price':'4.20','unit':'per 750ml bottle','stock_quantity':35,'organic_certified':False,'harvest_date':'2026-03-15','allergens':'','producer_id':P('p10')[0],'producer_name':P('p10')[1],'category':drinks,'farm_origin':'Chepstow','food_miles':'22','image_url':'https://images.unsplash.com/photo-1576673442511-7e39b6545c87?w=600&q=80'},
    {'name':'Raspberry Lemonade','description':'Pressed raspberries balanced with lemon.','price':'3.80','unit':'per 500ml bottle','stock_quantity':30,'organic_certified':False,'harvest_date':'2026-03-10','allergens':'','producer_id':P('p10')[0],'producer_name':P('p10')[1],'category':drinks,'farm_origin':'Chepstow','food_miles':'22','image_url':'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=600&q=80'},
]

for pd in products_data:
    pd['price'] = Decimal(pd['price'])
    if 'food_miles' in pd:
        pd['food_miles'] = Decimal(pd['food_miles'])
    Product.objects.create(**pd)

print(f"\n✅ Seeded {Category.objects.count()} categories, {Product.objects.count()} products")
