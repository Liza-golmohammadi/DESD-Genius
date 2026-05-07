from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from products.models import Product, Category
from orders.models import Order, ProducerOrder, ProducerOrderItem
from .models import Review

User = get_user_model()


class ReviewTestCase(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@test.com",
            password="testpass123",
            role="customer"
        )
        self.producer = User.objects.create_user(
            email="producer@test.com",
            password="testpass123",
            role="producer",
            minimum_order_value=5.00
        )
        self.category = Category.objects.create(name="Test Category")
        self.product = Product.objects.create(
            name="Test Product",
            description="Test Description",
            category=self.category,
            producer=self.producer,
            price=10.00,
            stock_quantity=100,
            is_available=True
        )

    def test_create_review_from_delivered_order(self):
        # Create an order and deliver it
        order = Order.objects.create(
            customer=self.customer,
            total_amount=10.00,
            delivery_address="123 Test St"
        )

        delivery_date = (datetime.now() + timedelta(days=3)).date()
        producer_order = ProducerOrder.objects.create(
            order=order,
            producer=self.producer,
            subtotal=10.00,
            delivery_date=delivery_date,
            status="delivered"
        )

        ProducerOrderItem.objects.create(
            producer_order=producer_order,
            product=self.product,
            quantity=1,
            unit_price=10.00
        )

        # Create a review
        review = Review.objects.create(
            product=self.product,
            customer=self.customer,
            producer_order=producer_order,
            rating=5,
            title="Great Product",
            comment="This product is excellent!"
        )

        self.assertEqual(review.rating, 5)
        self.assertTrue(review.is_verified_purchase)
        self.assertEqual(Review.objects.filter(product=self.product).count(), 1)

    def test_prevent_duplicate_reviews(self):
        # Create an order
        order = Order.objects.create(
            customer=self.customer,
            total_amount=10.00,
            delivery_address="123 Test St"
        )

        delivery_date = (datetime.now() + timedelta(days=3)).date()
        producer_order = ProducerOrder.objects.create(
            order=order,
            producer=self.producer,
            subtotal=10.00,
            delivery_date=delivery_date,
            status="delivered"
        )

        ProducerOrderItem.objects.create(
            producer_order=producer_order,
            product=self.product,
            quantity=1,
            unit_price=10.00
        )

        # Create first review
        Review.objects.create(
            product=self.product,
            customer=self.customer,
            producer_order=producer_order,
            rating=5,
            title="Great Product",
            comment="This product is excellent!"
        )

        # Attempt to create duplicate review should fail
        with self.assertRaises(Exception):
            Review.objects.create(
                product=self.product,
                customer=self.customer,
                producer_order=producer_order,
                rating=4,
                title="Good Product",
                comment="Also good!"
            )

    def test_review_string_representation(self):
        order = Order.objects.create(
            customer=self.customer,
            total_amount=10.00,
            delivery_address="123 Test St"
        )

        delivery_date = (datetime.now() + timedelta(days=3)).date()
        producer_order = ProducerOrder.objects.create(
            order=order,
            producer=self.producer,
            subtotal=10.00,
            delivery_date=delivery_date,
            status="delivered"
        )

        ProducerOrderItem.objects.create(
            producer_order=producer_order,
            product=self.product,
            quantity=1,
            unit_price=10.00
        )

        review = Review.objects.create(
            product=self.product,
            customer=self.customer,
            producer_order=producer_order,
            rating=5,
            title="Great Product",
            comment="Excellent!"
        )

        expected_str = f"Review of {self.product.name} by {self.customer.email} - 5★"
        self.assertEqual(str(review), expected_str)
