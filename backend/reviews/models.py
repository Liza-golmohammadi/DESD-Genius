from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product
from orders.models import ProducerOrder

User = get_user_model()


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    producer_order = models.ForeignKey(
        ProducerOrder,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="The delivered order this review is based on"
    )

    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    title = models.CharField(max_length=255)
    comment = models.TextField()

    is_verified_purchase = models.BooleanField(default=True)
    helpful_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [['product', 'customer']]
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['customer', 'created_at']),
        ]

    def __str__(self):
        return f"Review of {self.product.name} by {self.customer.email} - {self.rating}★"
