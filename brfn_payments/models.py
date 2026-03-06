from decimal import Decimal
from django.db import models
from django.utils import timezone


class CommissionRecord(models.Model):
    """
    Stores commission calculation for a single order.

    This is the financial trace record created after a successful (mock) payment.
    Later this model will be extended to support:
    - Multi-vendor split
    - Settlement aggregation
    - Payment transaction tracking
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("SETTLED", "Settled"),
    ]

    order_ref = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    # Nullable for smooth migrations when existing rows already exist.
    # We'll make this non-nullable later after a data migration.
    producer_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Commission Record"
        verbose_name_plural = "Commission Records"

    def __str__(self) -> str:
        return (
            f"{self.order_ref} | "
            f"Total: {self.total_amount} | "
            f"Commission: {self.commission_amount} | "
            f"Producer: {self.producer_amount} | "
            f"Status: {self.status}"
        )

    @staticmethod
    def calculate_split(total: Decimal) -> tuple[Decimal, Decimal]:
        """
        Calculates 5% commission and 95% producer share.
        """
        commission = (total * Decimal("0.05")).quantize(Decimal("0.01"))
        producer_share = (total - commission).quantize(Decimal("0.01"))
        return commission, producer_share