from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
import uuid
from decimal import Decimal
from django.utils import timezone


class CustomUserManager(UserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        # Auto-generate a unique email when none is provided (e.g. in tests)
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
	class CustomerRole(models.TextChoices):
		INDIVIDUAL = 'individual', 'Individual'
		COMMUNITY = 'community_group', 'Community Group'
		RESTAURANT = 'restaurant', 'Restaurant'
          
	email = models.EmailField(unique=True)
	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['first_name', 'last_name']

	is_producer = models.BooleanField(default=False)

	customer_role = models.CharField(
	max_length=20,
	choices=CustomerRole.choices,
	null= True,
	blank=True,
	default=None
	)
     
	accepted_terms_at = models.DateTimeField(null=True, blank=True)
	objects = CustomUserManager()

	def __str__(self):
		return f"{self.email} ({self.customer_role})"

	def mark_terms_accepted(self):
		self.accepted_terms_at = timezone.now()
	

class ProducerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='producer_profile')
    store_name = models.CharField(max_length=255)
    store_description = models.TextField(blank=True)
    store_created_at = models.DateTimeField(auto_now_add=True)
    store_contact = models.TextField(blank=True, default="")

    def __str__(self):
        return self.store_name
