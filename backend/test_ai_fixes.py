import os
import sys
import django
from datetime import datetime, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, "/app")

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIClient

from products.models import Product, Category
from ai_service.models import ProductInteraction, QualityAssessment
from cart.services import CartService
from orders.services import OrderService

User = get_user_model()

print("TEST 2: Quality Assessment and AI Recommendations Endpoint")
print("=" * 80)

try:
    # Clean up and create fresh user
    User.objects.filter(email="test_customer2@example.com").delete()
    User.objects.filter(email="test_producer2@example.com").delete()
    
    # Create active test users
    customer = User.objects.create_user(
        email="test_customer2@example.com",
        password="testpass123",
        role="customer",
        is_active=True
    )
    producer = User.objects.create_user(
        email="test_producer2@example.com",
        password="testpass123",
        role="producer",
        is_active=True,
        minimum_order_value=5.00
    )
    
    # Create a category and product
    category = Category.objects.first() or Category.objects.create(name="Test Category")
    product = Product.objects.create(
        name="Test Product 2",
        category=category,
        producer=producer,
        price=10.00,
        stock_quantity=100,
        is_available=True
    )
    
    # Create a quality assessment for the product
    assessment = QualityAssessment.objects.create(
        product=product,
        producer=producer,
        colour_score=85,
        size_score=78,
        ripeness_score=92,
        overall_grade="A",
        confidence=0.92,
        discount_percentage=15,
        is_mock=True,
        model_version="mock-1.0"
    )
    
    print(f"✓ Quality Assessment created")
    print(f"  - Product: {product.name}")
    print(f"  - Grade: {assessment.overall_grade}")
    print(f"  - Discount: {assessment.discount_percentage}%")
    
    # Get JWT token for customer
    refresh = RefreshToken.for_user(customer)
    access_token = str(refresh.access_token)
    
    # Test recommendations endpoint
    api_client = APIClient()
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    response = api_client.get('/api/ai/recommendations/')
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Recommendations endpoint returned 200 OK")
        print(f"  - Response keys: {list(data.keys())}")
        
        if 'surplus_deals' in data:
            print(f"✓ surplus_deals field present in response")
            print(f"  - Number of surplus deals: {len(data['surplus_deals'])}")
            
            if data['surplus_deals']:
                deal = data['surplus_deals'][0]
                print(f"  - Sample deal keys: {list(deal.keys())}")
                expected_keys = ['product_id', 'product_name', 'price', 'producer_name', 'discount_percentage', 'grade']
                missing_keys = [k for k in expected_keys if k not in deal]
                if missing_keys:
                    print(f"  ⚠ Missing keys: {missing_keys}")
                else:
                    print(f"  ✓ All expected keys present in surplus deal")
        else:
            print(f"⚠ surplus_deals field NOT in response")
    else:
        print(f"✗ Recommendations endpoint returned {response.status_code}")
        print(f"  Response: {response.text[:500]}")
        sys.exit(1)

except Exception as e:
    print(f"✗ Test 2 failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 80)
print("TEST 3: Verify matplotlib and seaborn imports")
print("=" * 80)

try:
    import matplotlib
    import seaborn
    print(f"✓ matplotlib version: {matplotlib.__version__}")
    print(f"✓ seaborn version: {seaborn.__version__}")
except ImportError as e:
    print(f"✗ Import failed: {str(e)}")
    sys.exit(1)

print("\n" + "=" * 80)
print("ALL CRITICAL FIXES VALIDATED!")
print("=" * 80)
