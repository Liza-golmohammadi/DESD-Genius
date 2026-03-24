from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "image_preview",
        "name",
        "price",
        "stock_quantity",
        "is_available",
        "producer",
        "category",
    )
    list_filter = ("is_available", "category", "producer")
    search_fields = ("name", "sku")
    readonly_fields = ("image_preview",)

    fieldsets = (
        ("Basic Info", {
            "fields": ("sku", "name", "description", "producer", "category")
        }),
        ("Pricing & Stock", {
            "fields": ("price", "unit", "stock_quantity", "low_stock_threshold", "is_available")
        }),
        ("Images", {
            "fields": ("image", "image_url", "image_preview")
        }),
        ("Availability", {
            "fields": ("available_from", "available_to", "harvest_date")
        }),
        ("Extra", {
            "fields": ("allergens", "organic_certified")
        }),
    )

    def image_preview(self, obj):
        image_src = None

        if obj.image:
            image_src = obj.image.url
        elif obj.image_url:
            image_src = obj.image_url

        if image_src:
            return format_html(
                '<img src="{}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" />',
                image_src
            )
        return "No image"

    image_preview.short_description = "Preview"