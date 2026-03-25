from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Recipe(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    ingredients = models.TextField(help_text="List of ingredients, one per line")
    producer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recipes",
        limit_choices_to={"role": "producer"},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title