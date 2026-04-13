from django.db import models
import uuid


PAYMENT_METHOD_CHOICES = [
    ('card', 'Card'),
    ('bank_transfer', 'Bank Transfer'),
    ('cash_on_delivery', 'Cash on Delivery'),
]

PAYMENT_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
    ('refunded', 'Refunded'),
]


class Payment(models.Model):
    """
    Order-level payment record.
    Tracks payments for orders from the orders microservice.
    No foreign keys to other services — uses string/UUID references instead.
    """
    payment_ref = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    order_number = models.UUIDField(db_index=True, help_text='Order UUID from orders service')
    customer_id = models.CharField(max_length=36, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='card')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.payment_ref} | Order {self.order_number} | {self.status}"
