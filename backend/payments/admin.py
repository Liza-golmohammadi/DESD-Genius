from django.contrib import admin
from django.utils import timezone
from .models import Payment, Settlement


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "order_ref",
        "customer",
        "total_amount",
        "commission_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("order__order_number", "order__customer__email")
    readonly_fields = ("created_at",)

    def order_ref(self, obj):
        return obj.order.order_number

    def customer(self, obj):
        return obj.order.customer.email


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order_ref",
        "producer",
        "subtotal",
        "commission_amount",
        "payout_amount",
        "status",
        "created_at",
        "paid_at",
    )
    list_filter = ("status", "created_at", "paid_at")
    search_fields = ("order__order_number", "producer__email")
    readonly_fields = ("created_at",)

    actions = ["mark_as_paid"]

    def order_ref(self, obj):
        return obj.order.order_number

    def mark_as_paid(self, request, queryset):
        updated = queryset.update(
            status="PAID",
            paid_at=timezone.now()
        )
        self.message_user(request, f"{updated} settlement(s) marked as PAID.")

    mark_as_paid.short_description = "Mark selected settlements as PAID"