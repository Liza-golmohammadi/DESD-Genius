from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        PRODUCER = 'PRODUCER', 'Producer'
    role = models.CharField(max_length=50, choices=Role.choices)
    
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    phone_number = models.CharField(max_length=20, blank=True, default="")
    terms_accepted = models.BooleanField(default=False)
    accepted_terms_at = models.DateTimeField(null=True, blank=True)
    
    REQUIRED_FIELDS = ['first_name', 'last_name', 'terms_accepted', 'role']

    def __str__(self):
        return f"{self.username} ({self.role})"


class CustomerProfile(models.Model):
    class AccountType(models.TextChoices):
        INDIVIDUAL = 'INDIVIDUAL', 'Individual'
        COMMUNITY = 'COMMUNITY', 'Community'
        RESTAURANT = 'RESTAURANT', 'Restaurant'

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='customer_profile') 
    account_type = models.CharField(max_length=50, choices=AccountType.choices, default=AccountType.INDIVIDUAL)
    address = models.TextField(blank=True, default="")
    postcode = models.CharField(max_length=20, blank=True, default="")
    
    def __str__(self):
        return f"{self.user.username} - {self.account_type}"
    def mark_terms_accepted(self):
        self.accepted_terms_at = timezone.now()
        self.save()

class ProducerProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='producer_profile')
    store_name = models.CharField(max_length=255)
    store_description = models.TextField(blank=True)
    store_contact_phone = models.CharField(max_length=20, blank=True)
    store_address = models.TextField(blank=True, default="")
    store_postcode = models.CharField(max_length=20, blank=True, default="")
    farm_story = models.TextField(blank=True, default="", help_text="The farm's story, background, and mission")
    store_created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.store_name
