from django.contrib import admin
from .models import CommissionRecord


@admin.register(CommissionRecord)
class CommissionRecordAdmin(admin.ModelAdmin):
    list_display = ("order_ref", "total_amount", "commission_amount", "created_at")
    search_fields = ("order_ref",)