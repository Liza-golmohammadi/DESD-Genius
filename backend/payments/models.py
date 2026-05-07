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


class WeeklySettlementCycle(models.Model):
    """
    Tracks weekly settlement cycles - one per week
    Automatically created every Sunday at midnight
    """
    week_start = models.DateField(unique=True, db_index=True)
    week_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("PENDING", "Pending"),
            ("PROCESSING", "Processing"),
            ("COMPLETED", "Completed"),
            ("FAILED", "Failed"),
        ],
        default="PENDING",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payout = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    num_settlements = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-week_start"]
        indexes = [models.Index(fields=["-week_start"])]

    def __str__(self):
        return f"Settlement Cycle: {self.week_start} to {self.week_end} ({self.status})"


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

    settlement_cycle = models.ForeignKey(
        WeeklySettlementCycle,
        on_delete=models.PROTECT,
        related_name="settlements",
        null=True,
        blank=True,
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
        unique_together = [["producer_order", "settlement_cycle"]]
        indexes = [
            models.Index(fields=["producer", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

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