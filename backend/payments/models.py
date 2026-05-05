from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.conf import settings

User = settings.AUTH_USER_MODEL


PAYMENT_STATUS_CHOICES = [
    ("PENDING", "Pending"),
    ("PAID", "Paid"),
    ("FAILED", "Failed"),
]

SETTLEMENT_STATUS_CHOICES = [
    ("PENDING", "Pending"),
    ("PAID", "Paid"),
]


class Payment(models.Model):
    """
    Order-level payment record
    """
    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="payment"
    )

    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="PENDING",
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment | {self.order.order_number} | {self.status}"


class Settlement(models.Model):
    """
    Producer-level payout tracking (THIS IS THE KEY MODEL 🔥)
    """
    producer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="settlements",
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="settlements",
    )

    producer_order = models.OneToOneField(
        "orders.ProducerOrder",
        on_delete=models.CASCADE,
        related_name="settlement",
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_amount = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=SETTLEMENT_STATUS_CHOICES,
        default="PENDING",
    )

    created_at = models.DateTimeField(default=timezone.now)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Settlement | {self.producer} | "
            f"Payout: {self.payout_amount} | Status: {self.status}"
        )

    @staticmethod
    def calculate(subtotal: Decimal):
        commission = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
        payout = (subtotal - commission).quantize(Decimal("0.01"))
        return commission, payout