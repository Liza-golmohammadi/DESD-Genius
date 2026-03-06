from django.contrib import admin
from .models import Order, ProducerOrder, ProducerOrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'customer', 'total_amount', 
        'commission_amount', 'status', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['order_number', 'customer__email']
    readonly_fields = ['order_number', 'commission_amount', 'created_at']

@admin.register(ProducerOrder)
class ProducerOrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'producer', 'subtotal', 
        'producer_payout', 'delivery_date', 'status'
    ]
    list_filter = ['status', 'delivery_date']
    search_fields = ['order__order_number', 'producer__email']

@admin.register(ProducerOrderItem)
class ProducerOrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'producer_order', 'product', 'quantity', 
        'unit_price', 'line_total'
    ]

    def line_total(self, obj):
        return obj.line_total
    line_total.short_description = 'Line Total'
