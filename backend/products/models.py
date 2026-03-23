from django.db import models

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductQuerySet(models.QuerySet):
    def visible_to_customers(self):
        today = timezone.localdate()
        return (
            self.filter(is_available=True, stock_quantity__gt=0)
            .filter(
                models.Q(available_from__isnull=True) | models.Q(available_from__lte=today),
                models.Q(available_to__isnull=True) | models.Q(available_to__gte=today),
            )
        )


class Product(models.Model):
    sku = models.CharField(max_length=32, blank=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField()

    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=50, default="unit")
    image_url = models.URLField(blank=True)

    stock_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    low_stock_threshold = models.IntegerField(default=5, validators=[MinValueValidator(0)])
    is_available = models.BooleanField(default=True)

    available_from = models.DateField(null=True, blank=True)
    available_to = models.DateField(null=True, blank=True)

    allergens = models.TextField(blank=True)
    organic_certified = models.BooleanField(default=False)
    harvest_date = models.DateField()

    producer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "producer"},
        related_name="products",
        db_index=True,
    )
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products", db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock_quantity__gte=0),
                name="product_stock_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="product_price_non_negative",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(available_from__isnull=True)
                    | models.Q(available_to__isnull=True)
                    | models.Q(available_from__lte=models.F("available_to"))
                ),
                name="product_season_range_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["category", "is_available"]),
            models.Index(fields=["producer", "is_available"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.producer.username})"

    @property
    def is_in_season(self) -> bool:
        today = timezone.localdate()
        if self.available_from and today < self.available_from:
            return False
        if self.available_to and today > self.available_to:
            return False
        return True

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.low_stock_threshold

    def is_orderable(self) -> bool:
        return self.is_available and self.stock_quantity > 0 and self.is_in_season