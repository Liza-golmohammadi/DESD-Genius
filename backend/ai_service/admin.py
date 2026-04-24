from django.contrib import admin
from .models import MLModel, QualityAssessment


@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ("name", "version", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "version")


@admin.register(QualityAssessment)
class QualityAssessmentAdmin(admin.ModelAdmin):
    list_display = ("product", "grade", "predicted_label", "confidence", "mode", "created_at")
    list_filter = ("grade", "mode")