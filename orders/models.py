from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal, ROUND_HALF_UP
import secrets
from datetime import datetime
from products.models import Product

User = get_user_model()

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('confirmed', 'Confirmed'),
    ('ready', 'Ready for Collection/Delivery'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
]

VALID_STATUS_TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['ready', 'cancelled'],
    'ready': ['delivered'],
    'delivered': [],
    'cancelled': [],
}

class Order(models.Model):
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    customer = models.ForeignKey(User, related_name='orders', on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_address = models.TextField()
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            date_str = datetime.now().strftime('%Y%m%d')
            random_str = secrets.token_hex(2).upper()  # 4 random chars
            self.order_number = f"ORD-{date_str}-{random_str}"
        
        # Ensure commission is always 5%
        self.commission_amount = (self.total_amount * Decimal('0.05')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        super().save(*args, **kwargs)

    def get_producer_count(self):
        return self.producer_orders.values('producer').distinct().count()

    def __str__(self):
        return f"{self.order_number} - {self.customer.email}"

class ProducerOrder(models.Model):
    order = models.ForeignKey(Order, related_name='producer_orders', on_delete=models.CASCADE)
    producer = models.ForeignKey(
        User, 
        related_name='producer_orders', 
        on_delete=models.PROTECT,
        limit_choices_to={'role': 'producer'}
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    producer_payout = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_date = models.DateField()
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Ensure producer payout is always 95%
        self.producer_payout = (self.subtotal * Decimal('0.95')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        super().save(*args, **kwargs)

    def is_status_transition_valid(self, new_status):
        return new_status in VALID_STATUS_TRANSITIONS.get(self.status, [])

    def __str__(self):
        return f"Sub-order for {self.producer.email} | Order {self.order.order_number}"

class ProducerOrderItem(models.Model):
    producer_order = models.ForeignKey(ProducerOrder, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def line_total(self):
        return (Decimal(str(self.quantity)) * self.unit_price).quantize(Decimal('0.01'))

    def __str__(self):
        return f"{self.quantity} x {self.product.name} @ £{self.unit_price}"
