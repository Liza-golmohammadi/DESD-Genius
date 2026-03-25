from django.test import TestCase
from django.contrib.auth import get_user_model
from products.models import Product, Category
from cart.services import CartService
from .models import Order, ProducerOrder, ProducerOrderItem
from .services import OrderService
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.utils import timezone
import re

User = get_user_model()

class OrderTests(TestCase):
    def setUp(self):
        # Create users
        # - 1 customer User (role='customer')
        self.customer = User.objects.create_user(username='cust', email='cust@test.com', role='customer')
        # - 2 producer Users (role='producer')
        self.producer1 = User.objects.create_user(username='prod1', email='prod1@test.com', role='producer')
        self.producer2 = User.objects.create_user(username='prod2', email='prod2@test.com', role='producer')
        
        # Create category
        self.cat = Category.objects.create(name='Food')
        
        # - 3 Products:
        # product_a: producer=producer1, price=Decimal('3.50'), stock=50, is_available=True
        self.product_a = Product.objects.create(
            name='Product A', price=Decimal('3.50'), stock_quantity=50, 
            producer=self.producer1, category=self.cat, harvest_date=date.today(), is_available=True
        )
        # product_b: producer=producer1, price=Decimal('12.00'), stock=20, is_available=True
        self.product_b = Product.objects.create(
            name='Product B', price=Decimal('12.00'), stock_quantity=20, 
            producer=self.producer1, category=self.cat, harvest_date=date.today(), is_available=True
        )
        # product_c: producer=producer2, price=Decimal('5.00'), stock=30, is_available=True
        self.product_c = Product.objects.create(
            name='Product C', price=Decimal('5.00'), stock_quantity=30, 
            producer=self.producer2, category=self.cat, harvest_date=date.today(), is_available=True
        )

    def test_single_producer_order_creation(self):
        # Cart: product_a qty=2, product_b qty=1 (both producer1)
        # Subtotal = (2×3.50) + (1×12.00) = £19.00
        CartService.add_item(self.customer, self.product_a.id, 2)
        CartService.add_item(self.customer, self.product_b.id, 1)
        
        delivery_date = timezone.now().date() + timedelta(days=3)
        delivery_dates = {self.producer1.id: delivery_date}
        
        order = OrderService.create_order_from_cart(self.customer, "123 Street", delivery_dates)
        
        # Assert Order created with: total_amount = Decimal('19.00'), commission_amount = Decimal('0.95')
        self.assertEqual(order.total_amount, Decimal('19.00'))
        self.assertEqual(order.commission_amount, Decimal('0.95'))
        
        # Assert 1 ProducerOrder created with: subtotal = Decimal('19.00'), producer_payout = Decimal('18.05')
        self.assertEqual(order.producer_orders.count(), 1)
        po = order.producer_orders.first()
        self.assertEqual(po.subtotal, Decimal('19.00'))
        self.assertEqual(po.producer_payout, Decimal('18.05'))
        
        # Assert product_a.stock_quantity decremented by 2
        self.product_a.refresh_from_db()
        self.assertEqual(self.product_a.stock_quantity, 48)
        
        # Assert cart is empty after order
        summary = CartService.get_cart_summary(self.customer)
        self.assertEqual(summary['item_count'], 0)

    def test_multi_vendor_order_creation(self):
        # Cart: product_a qty=2 (producer1, £3.50), product_c qty=4 (producer2, £5.00)
        # Producer1 subtotal = £7.00, Producer2 subtotal = £20.00
        # grand_total = £27.00, commission = £1.35
        CartService.add_item(self.customer, self.product_a.id, 2)
        CartService.add_item(self.customer, self.product_c.id, 4)
        
        today = timezone.now().date()
        delivery_dates = {
            self.producer1.id: today + timedelta(days=3),
            self.producer2.id: today + timedelta(days=4),
        }
        
        order = OrderService.create_order_from_cart(self.customer, "123 Street", delivery_dates)
        
        self.assertEqual(order.total_amount, Decimal('27.00'))
        self.assertEqual(order.commission_amount, Decimal('1.35'))
        self.assertEqual(order.producer_orders.count(), 2)
        
        po1 = order.producer_orders.get(producer=self.producer1)
        self.assertEqual(po1.producer_payout, Decimal('6.65')) # 95% of 7.00
        
        po2 = order.producer_orders.get(producer=self.producer2)
        self.assertEqual(po2.producer_payout, Decimal('19.00')) # 95% of 20.00

    def test_48_hour_lead_time_enforced(self):
        # Cart: product_a qty=1
        CartService.add_item(self.customer, self.product_a.id, 1)
        # delivery_date = datetime.now().date() + timedelta(hours=24) # too soon
        delivery_date = (timezone.now() + timedelta(hours=24)).date()
        delivery_dates = {self.producer1.id: delivery_date}
        
        with self.assertRaises(ValueError) as cm:
            OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        self.assertIn('48 hours', str(cm.exception))

    def test_valid_48_hour_delivery_date_accepted(self):
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_date = (timezone.now() + timedelta(days=3)).date()
        delivery_dates = {self.producer1.id: delivery_date}
        # Assert no error raised
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        self.assertIsNotNone(order)

    def test_producer_sees_only_own_orders(self):
        # Create order with items from both producers
        CartService.add_item(self.customer, self.product_a.id, 1)
        CartService.add_item(self.customer, self.product_c.id, 1)
        today = timezone.now().date()
        delivery_dates = {
            self.producer1.id: today + timedelta(days=3),
            self.producer2.id: today + timedelta(days=3),
        }
        OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        
        # get_producer_orders(producer1) should return 1 ProducerOrder
        p1_orders = OrderService.get_producer_orders(self.producer1)
        self.assertEqual(p1_orders.count(), 1)
        self.assertEqual(p1_orders[0].producer, self.producer1)
        
        # get_producer_orders(producer2) should return 1 ProducerOrder
        p2_orders = OrderService.get_producer_orders(self.producer2)
        self.assertEqual(p2_orders.count(), 1)
        self.assertEqual(p2_orders[0].producer, self.producer2)
        
        # producer1's result should NOT contain producer2's items
        for item in p1_orders[0].items.all():
            self.assertEqual(item.product.producer, self.producer1)

    def test_producer_cannot_update_other_producers_order(self):
        # Create order, get producer2's ProducerOrder
        CartService.add_item(self.customer, self.product_c.id, 1)
        delivery_dates = {self.producer2.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        po2 = order.producer_orders.first()
        
        # Assert PermissionError when producer1 calls update_producer_order_status
        with self.assertRaises(PermissionError):
            OrderService.update_producer_order_status(self.producer1, po2.id, 'confirmed')

    def test_valid_status_transition(self):
        # pending -> confirmed -> ready -> delivered
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        po = order.producer_orders.first()
        
        # pending -> confirmed: Assert succeeds
        OrderService.update_producer_order_status(self.producer1, po.id, 'confirmed')
        po.refresh_from_db()
        self.assertEqual(po.status, 'confirmed')
        
        # confirmed -> ready: Assert succeeds
        OrderService.update_producer_order_status(self.producer1, po.id, 'ready')
        po.refresh_from_db()
        self.assertEqual(po.status, 'ready')
        
        # ready -> delivered: Assert succeeds
        OrderService.update_producer_order_status(self.producer1, po.id, 'delivered')
        po.refresh_from_db()
        self.assertEqual(po.status, 'delivered')

    def test_invalid_status_transition(self):
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        po = order.producer_orders.first()
        
        # pending -> delivered: Assert ValueError raised
        with self.assertRaises(ValueError):
            OrderService.update_producer_order_status(self.producer1, po.id, 'delivered')
        
        # delivered -> pending: (Need to be delivered first)
        po.status = 'delivered'
        po.save()
        with self.assertRaises(ValueError):
            OrderService.update_producer_order_status(self.producer1, po.id, 'pending')

    def test_order_number_format(self):
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        # Assert order.order_number matches regex: r'^ORD-\d{8}-[A-Z0-9]{4}$'
        self.assertTrue(re.match(r'^ORD-\d{8}-[A-Z0-9]{4}$', order.order_number))

    def test_reorder_all_available(self):
        # Create and complete an order
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        
        # Call reorder(customer, order_number)
        result = OrderService.reorder(self.customer, order.order_number)
        
        # Assert all items in 'added' list, 'unavailable' is empty
        self.assertEqual(len(result['added']), 1)
        self.assertEqual(len(result['unavailable']), 0)
        self.assertEqual(result['added'][0]['product_id'], self.product_a.id)
        
        # Assert CartItems exist with correct quantities
        self.assertEqual(CartService.get_cart_summary(self.customer)['item_count'], 1)

    def test_reorder_partial_unavailability(self):
        # Create order with product_a and product_c
        CartService.add_item(self.customer, self.product_a.id, 1)
        CartService.add_item(self.customer, self.product_c.id, 1)
        today = timezone.now().date()
        delivery_dates = {
            self.producer1.id: today + timedelta(days=3),
            self.producer2.id: today + timedelta(days=3),
        }
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        
        # Set product_c.is_available = False
        self.product_c.is_available = False
        self.product_c.save()
        
        # Call reorder()
        result = OrderService.reorder(self.customer, order.order_number)
        
        # Assert product_a in 'added', product_c in 'unavailable'
        self.assertEqual(len(result['added']), 1)
        self.assertEqual(result['added'][0]['product_id'], self.product_a.id)
        self.assertEqual(len(result['unavailable']), 1)
        self.assertEqual(result['unavailable'][0]['product_id'], self.product_c.id)
        
        # Assert reason contains 'out_of_stock'
        self.assertIn('out_of_stock', result['unavailable'][0]['reason'])

    def test_unit_price_snapshot(self):
        # Create order with product_a (price=£3.50)
        CartService.add_item(self.customer, self.product_a.id, 1)
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        
        # Change product_a.price to £9.99 and save
        self.product_a.price = Decimal('9.99')
        self.product_a.save()
        
        # Fetch ProducerOrderItem
        item = ProducerOrderItem.objects.get(producer_order__order=order, product=self.product_a)
        # Assert item.unit_price == Decimal('3.50') # original price preserved
        self.assertEqual(item.unit_price, Decimal('3.50'))

    def test_producer_minimum_order_value_enforced(self):
        # Set producer1 minimum to £20
        self.producer1.minimum_order_value = Decimal('20.00')
        self.producer1.save()

        # Add item from producer1 that sums to £3.50 (below £20)
        CartService.add_item(self.customer, self.product_a.id, 1)
        
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        
        with self.assertRaises(ValueError) as cm:
            OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        self.assertIn('below their minimum', str(cm.exception))

    def test_producer_minimum_order_value_met_succeeds(self):
        # Set producer1 minimum to £10
        self.producer1.minimum_order_value = Decimal('10.00')
        self.producer1.save()

        # Add items from producer1 that sum to £10.50 (3 * 3.50, above £10)
        CartService.add_item(self.customer, self.product_a.id, 3)
        
        delivery_dates = {self.producer1.id: timezone.now().date() + timedelta(days=3)}
        
        # Should NOT raise ValueError
        order = OrderService.create_order_from_cart(self.customer, "Addr", delivery_dates)
        self.assertIsNotNone(order)
        self.assertEqual(order.total_amount, Decimal('10.50'))