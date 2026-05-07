from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    # For percentage discounts, max is 100%
    # For fixed discounts, can be any amount
    maximum_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum discount amount (useful for percentage-based coupons)"
    )

    minimum_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Minimum order value to use this coupon"
    )

    # Usage limits
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Total number of times this coupon can be used (null = unlimited)"
    )
    max_uses_per_user = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Maximum times a single user can use this coupon"
    )

    # Active period
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active', 'valid_from', 'valid_until']),
        ]

    def __str__(self):
        return f"{self.code} - {self.discount_value}{('% off' if self.discount_type == 'percentage' else '£ off')}"

    def is_valid(self):
        if not self.is_active:
            return False
        if timezone.now() < self.valid_from:
            return False
        if self.valid_until and timezone.now() > self.valid_until:
            return False
        if self.max_uses and self.coupon_uses.count() >= self.max_uses:
            return False
        return True

    def get_discount_amount(self, subtotal):
        """Calculate the discount amount for a given subtotal"""
        if not self.is_valid():
            return 0

        if self.discount_type == 'percentage':
            discount = subtotal * (self.discount_value / 100)
            if self.maximum_discount:
                discount = min(discount, self.maximum_discount)
        else:
            discount = min(self.discount_value, subtotal)

        return discount


class CouponUse(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='coupon_uses')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='coupon_uses')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='coupon_uses', null=True, blank=True)

    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-used_at']
        unique_together = [['coupon', 'user', 'order']]
        indexes = [
            models.Index(fields=['coupon', 'user']),
            models.Index(fields=['user', 'used_at']),
        ]

    def __str__(self):
        return f"{self.coupon.code} used by {self.user.email}"


class ProductDiscount(models.Model):
    """Automatic discounts based on product quality assessment"""
    product = models.OneToOneField('products.Product', on_delete=models.CASCADE, related_name='discount')
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    reason = models.CharField(
        max_length=255,
        help_text="e.g., 'Quality assessment grade B', 'Overstocked items'"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.discount_percentage}% off"

    def get_discounted_price(self):
        original_price = self.product.price
        discount_amount = original_price * (self.discount_percentage / 100)
        return original_price - discount_amount
