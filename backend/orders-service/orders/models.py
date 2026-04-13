from django.db import models
from decimal import Decimal
import uuid


class Cart(models.Model):
    """Per-customer shopping cart. customer_id is the UUID string from the auth service."""
    customer_id = models.CharField(max_length=36, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for customer {self.customer_id}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=255, default='')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'product_id')

    @property
    def line_total(self):
        return Decimal(str(self.quantity)) * self.unit_price

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"


ORDER_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('confirmed', 'Confirmed'),
    ('ready', 'Ready'),
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
    order_number = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    customer_id = models.CharField(max_length=36, db_index=True)
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    delivery_address = models.TextField(blank=True, default='')
    delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} - customer {self.customer_id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product_id = models.IntegerField(db_index=True)
    product_name = models.CharField(max_length=255)
    producer_id = models.CharField(max_length=36, db_index=True, default='')
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def line_total(self):
        return (Decimal(str(self.quantity)) * self.unit_price).quantize(Decimal('0.01'))

    def __str__(self):
        return f"{self.quantity} x {self.product_name} @ £{self.unit_price}"