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
		default='customer'
	)
	
	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['first_name', 'last_name']

	def __str__(self):
		return f"{self.email} ({self.role})"


