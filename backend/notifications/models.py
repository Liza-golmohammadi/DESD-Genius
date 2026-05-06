from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    """
    In-app notification delivered to either a producer or customer.

    Notification types:
      - new_order        → sent to producer when a customer places an order
      - low_stock        → sent to producer when a product stock falls to/below threshold
      - status_update    → sent to customer when a producer updates order status
    """

    TYPE_CHOICES = [
        ("new_order", "New Order"),
        ("low_stock", "Low Stock Alert"),
        ("status_update", "Order Status Update"),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)

    # Optional FK references for deep-linking on the frontend
    order_number = models.CharField(max_length=50, blank=True, default="")
    product_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.email}"
