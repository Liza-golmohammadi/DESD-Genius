# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.

"""
AI Service Django Admin
========================
Registers all AI service models with the Django admin interface.
Provides custom actions for producers and admins.
"""

from django.contrib import admin
from django.utils.html import format_html

from ai_service.models import (
    QualityAssessment,
    MLModel,
    ProductInteraction,
    RecommendationLog,
    ModelEvaluationReport,
)


@admin.register(QualityAssessment)
class QualityAssessmentAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "product",
        "producer",
        "overall_grade",
        "confidence_display",
        "auto_discount_applied",
        "discount_percentage",
        "is_mock",
        "assessed_at",
    ]
    list_filter = ["overall_grade", "is_mock", "auto_discount_applied", "assessed_at"]
    search_fields = ["product__name", "producer__email"]
    readonly_fields = [
        "colour_score",
        "size_score",
        "ripeness_score",
        "overall_grade",
        "confidence",
        "is_mock",
        "model_version",
        "assessed_at",
    ]
    ordering = ["-assessed_at"]
    date_hierarchy = "assessed_at"

    @admin.display(description="Confidence")
    def confidence_display(self, obj):
        pct = round(obj.confidence * 100, 1)
        colour = "#1A5C38" if pct >= 85 else "#FF8C00" if pct >= 70 else "#CC0000"
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            colour,
            pct,
        )

    @admin.action(description="Re-assess selected products (mock)")
    def reassess_products(self, request, queryset):
        from ai_service.services.quality_classifier import QualityClassifierService

        count = 0
        for assessment in queryset.select_related("product", "producer"):
            try:
                QualityClassifierService.assess_product(
                    product_id=assessment.product_id,
                    producer_user=assessment.producer,
                )
                count += 1
            except Exception:
                pass
        self.message_user(request, f"Re-assessed {count} product(s).")

    actions = ["reassess_products"]


@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "version",
        "model_type",
        "accuracy",
        "f1_score",
        "is_active",
        "uploaded_at",
    ]
    list_filter = ["model_type", "is_active", "uploaded_at"]
    search_fields = ["name", "version"]
    readonly_fields = ["uploaded_at"]
    ordering = ["-uploaded_at"]

    @admin.action(description="Activate selected model (deactivates others of same type)")
    def activate_model(self, request, queryset):
        for ml_model in queryset:
            ml_model.is_active = True
            ml_model.save()
        self.message_user(
            request,
            f"Activated {queryset.count()} model(s). Others of the same type deactivated.",
        )

    actions = ["activate_model"]


@admin.register(ProductInteraction)
class ProductInteractionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "customer",
        "product",
        "interaction_type",
        "quantity",
        "created_at",
    ]
    list_filter = ["interaction_type", "created_at"]
    search_fields = ["customer__email", "product__name"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"


@admin.register(RecommendationLog)
class RecommendationLogAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "customer",
        "algorithm_used",
        "products_boosted",
        "products_suppressed",
        "created_at",
    ]
    list_filter = ["algorithm_used", "created_at"]
    search_fields = ["customer__email"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    filter_horizontal = ["recommended_products"]


@admin.register(ModelEvaluationReport)
class ModelEvaluationReportAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "ml_model",
        "test_samples",
        "accuracy",
        "f1_score",
        "override_rate",
        "evaluated_at",
    ]
    list_filter = ["evaluated_at"]
    search_fields = ["ml_model__name"]
    readonly_fields = [
        "accuracy",
        "precision",
        "recall",
        "f1_score",
        "grade_a_accuracy",
        "grade_b_accuracy",
        "grade_c_accuracy",
        "confusion_matrix_json",
        "override_rate",
        "evaluated_at",
    ]
    ordering = ["-evaluated_at"]
    date_hierarchy = "evaluated_at"
