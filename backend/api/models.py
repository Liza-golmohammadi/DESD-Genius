from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
	email = models.EmailField(unique=True)
	is_active = models.BooleanField(default=False)

	ROLE_CHOICES = (
		('customer', 'Customer'),
		('producer', 'Producer'),
	)
	role = models.CharField(
		max_length=10,
		choices=ROLE_CHOICES,
		default='producer'
	)
	
	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['first_name', 'last_name']

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
