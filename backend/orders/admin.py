from django.contrib import admin
from .models import Order, ProducerOrder, ProducerOrderItem


class ProducerOrderItemInline(admin.TabularInline):
    model = ProducerOrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "unit_price", "line_total_display")
    fields = ("product", "quantity", "unit_price", "line_total_display")

    def line_total_display(self, obj):
        return obj.line_total

    line_total_display.short_description = "Line Total"


class ProducerOrderInline(admin.TabularInline):
    model = ProducerOrder
    extra = 0
    readonly_fields = (
        "producer",
        "subtotal",
        "producer_payout",
        "delivery_date",
        "status",
        "created_at",
        "updated_at",
        "notes",
    )
    fields = (
        "producer",
        "subtotal",
        "producer_payout",
        "delivery_date",
        "status",
        "notes",
        "created_at",
        "updated_at",
    )
    show_change_link = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "total_amount",
        "commission_amount",
        "status",
        "producer_count",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "customer__email", "customer__first_name", "customer__last_name")
    readonly_fields = (
        "order_number",
        "commission_amount",
        "created_at",
        "updated_at",
    )
    inlines = [ProducerOrderInline]

    def producer_count(self, obj):
        return obj.get_producer_count()

    producer_count.short_description = "Producer Count"


@admin.register(ProducerOrder)
class ProducerOrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order_ref",
        "producer",
        "subtotal",
        "producer_payout",
        "delivery_date",
        "status",
        "created_at",
    )
    list_filter = ("status", "delivery_date", "created_at")
    search_fields = (
        "order__order_number",
        "producer__email",
        "producer__first_name",
        "producer__last_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "producer_payout",
    )
    inlines = [ProducerOrderItemInline]

    def order_ref(self, obj):
        return obj.order.order_number

    order_ref.short_description = "Order Ref"


@admin.register(ProducerOrderItem)
class ProducerOrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "producer_order",
        "product",
        "quantity",
        "unit_price",
        "line_total_display",
    )
    search_fields = (
        "producer_order__order__order_number",
        "product__name",
    )

    def line_total_display(self, obj):
        return obj.line_total

    line_total_display.short_description = "Line Total"