from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
import uuid
from decimal import Decimal


class CustomUserManager(UserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            email = f"auto_{uuid.uuid4().hex}@placeholder.invalid"
        if not username:
            username = email
        return super().create_user(username, email=email, password=password, **extra_fields)

    def create_superuser(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            email = f"auto_{uuid.uuid4().hex}@placeholder.invalid"
        if not username:
            username = email
        return super().create_superuser(username, email=email, password=password, **extra_fields)


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=False)

    ROLE_CHOICES = (
        ("customer", "Customer"),
        ("producer", "Producer"),
        ("admin", "Admin"),
    )

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default="customer",
    )

    minimum_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Minimum order subtotal required for this producer (0 = no minimum).",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


class Producer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    store_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    contact_info = models.TextField(blank=True, default="")

    def __str__(self):
        return self.store_name