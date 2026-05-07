from django.contrib import admin
from .models import Coupon, CouponUse, ProductDiscount


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code',
        'discount_type',
        'discount_value',
        'maximum_discount',
        'is_active',
        'valid_from',
        'valid_until',
        'usage_count',
    ]
    list_filter = ['discount_type', 'is_active', 'valid_from', 'valid_until']
    search_fields = ['code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Coupon Details', {
            'fields': ('code', 'description', 'discount_type', 'discount_value', 'maximum_discount')
        }),
        ('Usage Limits', {
            'fields': ('minimum_order_value', 'max_uses', 'max_uses_per_user')
        }),
        ('Validity Period', {
            'fields': ('is_active', 'valid_from', 'valid_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def usage_count(self, obj):
        count = obj.coupon_uses.count()
        max_uses = obj.max_uses or '∞'
        return f"{count}/{max_uses}"
    usage_count.short_description = "Usage"


@admin.register(CouponUse)
class CouponUseAdmin(admin.ModelAdmin):
    list_display = ['coupon', 'user', 'used_at']
    list_filter = ['coupon', 'used_at']
    search_fields = ['coupon__code', 'user__email']
    readonly_fields = ['used_at']
    ordering = ['-used_at']


@admin.register(ProductDiscount)
class ProductDiscountAdmin(admin.ModelAdmin):
    list_display = [
        'product',
        'discount_percentage',
        'reason',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'discount_percentage', 'created_at']
    search_fields = ['product__name', 'reason']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
