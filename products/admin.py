from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "producer",
        "category",
        "price",
        "unit",
        "stock_quantity",
        "low_stock_badge",
        "is_available",
        "season_window",
        "organic_certified",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "category",
        "is_available",
        "organic_certified",
        "available_from",
        "available_to",
        "producer",
    )
    search_fields = ("name", "description", "sku", "producer__username")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")

    # IMPORTANT: no autocomplete_fields until User admin is registered
    # autocomplete_fields = ("producer", "category")

    fieldsets = (
        ("Core", {"fields": ("sku", "name", "description", "category", "producer")}),
        ("Commercial", {"fields": ("price", "unit", "image_url")}),
        ("Inventory & Availability", {"fields": ("stock_quantity", "low_stock_threshold", "is_available")}),
        ("Seasonality", {"fields": ("available_from", "available_to")}),
        ("Labels", {"fields": ("allergens", "organic_certified", "harvest_date")}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )

    def low_stock_badge(self, obj):
        if obj.stock_quantity <= obj.low_stock_threshold:
             return format_html(
            '<span style="color:#b91c1c; font-weight:600;">{}</span>',
            "LOW"
        )
        return format_html(
        '<span style="color:#15803d; font-weight:600;">{}</span>',
        "OK"
    )

    low_stock_badge.short_description = "Stock"

    def season_window(self, obj: Product):
        if not obj.available_from and not obj.available_to:
            return "Year-round"
        start = obj.available_from.isoformat() if obj.available_from else "—"
        end = obj.available_to.isoformat() if obj.available_to else "—"
        label = "In season" if obj.is_in_season else "Out of season"
        return f"{start} → {end} ({label})"

    season_window.short_description = "Season"