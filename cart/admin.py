from django.contrib import admin
from .models import Cart, CartItem

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['customer', 'item_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['customer__email']

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Item Count'

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity', 'line_total']
    search_fields = ['product__name', 'cart__customer__email']

    def line_total(self, obj):
        return obj.line_total
    line_total.short_description = 'Line Total'
