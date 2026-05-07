from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "product",
        "customer",
        "rating",
        "is_verified_purchase",
        "helpful_count",
        "created_at",
    ]
    list_filter = ["rating", "is_verified_purchase", "created_at"]
    search_fields = ["product__name", "customer__email", "title", "comment"]
    readonly_fields = ["created_at", "updated_at", "is_verified_purchase", "helpful_count"]
    ordering = ["-created_at"]
