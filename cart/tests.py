from django.test import TestCase
from django.contrib.auth import get_user_model
from products.models import Product, Category
from .models import Cart, CartItem
from .services import CartService
from decimal import Decimal
from datetime import date

User = get_user_model()

class CartTests(TestCase):
    def setUp(self):
        # Create users
        self.customer = User.objects.create_user(username='cust', email='cust@test.com', role='customer')
        self.producer = User.objects.create_user(username='prod', email='prod@test.com', role='producer')
        self.other_user = User.objects.create_user(username='other', role='admin')
        
        # Create category and products
        self.cat = Category.objects.create(name='Veg')
        self.product1 = Product.objects.create(
            name='Carrot', price=Decimal('1.50'), stock_quantity=10, 
            producer=self.producer, category=self.cat, harvest_date=date.today()
        )
        self.product2 = Product.objects.create(
            name='Potato', price=Decimal('2.00'), stock_quantity=5, 
            producer=self.producer, category=self.cat, harvest_date=date.today()
        )

    def test_get_or_create_cart(self):
        cart = CartService.get_or_create_cart(self.customer)
        self.assertEqual(cart.customer, self.customer)
        
        # Should raise error for non-customer
        with self.assertRaises(PermissionError):
            CartService.get_or_create_cart(self.other_user)

    def test_add_item_creates_cart_and_item(self):
        # CartService.add_item(customer, product_a.id, 2)
        item = CartService.add_item(self.customer, self.product1.id, 2)
        self.assertEqual(item.quantity, 2)
        self.assertTrue(CartItem.objects.filter(cart__customer=self.customer, product=self.product1, quantity=2).exists())

    def test_add_same_item_increments_quantity(self):
        # Add product_a quantity=2, then add again quantity=3
        CartService.add_item(self.customer, self.product1.id, 2)
        CartService.add_item(self.customer, self.product1.id, 3)
        item = CartItem.objects.get(cart__customer=self.customer, product=self.product1)
        self.assertEqual(item.quantity, 5)

    def test_add_item_unavailable_product_raises(self):
        # Set product_a.is_available=False
        self.product1.is_available = False
        self.product1.save()
        with self.assertRaises(ValueError):
            CartService.add_item(self.customer, self.product1.id, 1)

    def test_add_item_exceeds_stock_raises(self):
        # Assert ValueError raised when quantity > product.stock_quantity
        with self.assertRaises(ValueError):
            CartService.add_item(self.customer, self.product1.id, 11)

    def test_remove_item_nonexistent_is_silent(self):
        # Assert no exception raised when removing product not in cart
        CartService.remove_item(self.customer, 999) # Should be silent

    def test_cart_summary_grouped_by_producer(self):
        # Add product_a and product_b (both producer1), add product_c (producer2)
        # Using self.product1, self.product2 (same producer), adding self.product3
        prod2 = User.objects.create_user(username='prod2', role='producer')
        product3 = Product.objects.create(
            name='Onion', price=Decimal('1.00'), stock_quantity=10, 
            producer=prod2, category=self.cat, harvest_date=date.today()
        )
        CartService.add_item(self.customer, self.product1.id, 1)
        CartService.add_item(self.customer, self.product2.id, 1)
        CartService.add_item(self.customer, product3.id, 1)
        
        summary = CartService.get_cart_summary(self.customer)
        self.assertEqual(len(summary['producers']), 2)
        # Check producer with 2 items
        p1_group = next(p for p in summary['producers'] if p['producer_id'] == self.producer.id)
        self.assertEqual(len(p1_group['items']), 2)
        # Check producer with 1 item
        p2_group = next(p for p in summary['producers'] if p['producer_id'] == prod2.id)
        self.assertEqual(len(p2_group['items']), 1)

    def test_cart_summary_grand_total(self):
        # Add product_a qty=2 (£3.50 each), product_c qty=3 (£5.00 each)
        p_a = Product.objects.create(
            name='A', price=Decimal('3.50'), stock_quantity=10, 
            producer=self.producer, category=self.cat, harvest_date=date.today()
        )
        p_c = Product.objects.create(
            name='C', price=Decimal('5.00'), stock_quantity=10, 
            producer=self.producer, category=self.cat, harvest_date=date.today()
        )
        CartService.add_item(self.customer, p_a.id, 2)
        CartService.add_item(self.customer, p_c.id, 3)
        summary = CartService.get_cart_summary(self.customer)
        self.assertEqual(summary['grand_total'], Decimal('22.00'))

    def test_clear_cart(self):
        CartService.add_item(self.customer, self.product1.id, 1)
        CartService.clear_cart(self.customer)
        self.assertEqual(CartItem.objects.count(), 0)
