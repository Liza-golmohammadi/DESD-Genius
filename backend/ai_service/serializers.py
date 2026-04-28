# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
AI Service Serializers
=======================
DRF serializers for all AI service models and response structures.

Serializers are intentionally read-only where data is produced by the
system (assessments, recommendations) and include nested XAI explanations
so the frontend receives a single, complete response per request.
"""

from rest_framework import serializers

from ai_service.models import (
    QualityAssessment,
    MLModel,
    ProductInteraction,
    RecommendationLog,
    ModelEvaluationReport,
)
from ai_service.services.xai_service import XAIService


class GradeBreakdownSerializer(serializers.Serializer):
    """
    Read-only serializer for per-attribute grade breakdown data.
    Produced by QualityAssessment.get_grade_breakdown().
    """

    colour = serializers.DictField(read_only=True)
    size = serializers.DictField(read_only=True)
    ripeness = serializers.DictField(read_only=True)
    overall_grade = serializers.CharField(read_only=True)
    weakest_attribute = serializers.CharField(read_only=True)
    explanation = serializers.CharField(read_only=True)
    confidence = serializers.FloatField(read_only=True)
    is_mock = serializers.BooleanField(read_only=True)


class QualityAssessmentSerializer(serializers.ModelSerializer):
    """
    Full quality assessment serializer including XAI explanation.

    Includes nested grade breakdown and discount recommendation so the
    frontend can display a complete quality report in a single request.
    """

    product_name = serializers.CharField(source="product.name", read_only=True)
    grade_display = serializers.CharField(
        source="get_overall_grade_display", read_only=True
    )
    grade_breakdown = serializers.SerializerMethodField()
    xai_explanation = serializers.SerializerMethodField()
    discount_recommendation = serializers.SerializerMethodField()

    class Meta:
        model = QualityAssessment
        fields = [
            "id",
            "product_id",
            "product_name",
            "producer_id",
            "colour_score",
            "size_score",
            "ripeness_score",
            "overall_grade",
            "grade_display",
            "confidence",
            "is_mock",
            "auto_discount_applied",
            "discount_percentage",
            "assessed_at",
            "model_version",
            "grade_breakdown",
            "xai_explanation",
            "discount_recommendation",
        ]
        read_only_fields = fields

    def get_grade_breakdown(self, obj):
        """Return structured per-attribute breakdown with thresholds."""
        return obj.get_grade_breakdown()

    def get_xai_explanation(self, obj):
        """Return two-tier XAI explanation (technical + non-technical)."""
        return XAIService.generate_explanation(obj)

    def get_discount_recommendation(self, obj):
        """Return discount recommendation for the producer dashboard."""
        return obj.get_discount_recommendation()


class QualityAssessmentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views — omits heavy nested fields.
    """

    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = QualityAssessment
        fields = [
            "id",
            "product_name",
            "overall_grade",
            "confidence",
            "auto_discount_applied",
            "assessed_at",
            "is_mock",
        ]
        read_only_fields = fields


class MLModelSerializer(serializers.ModelSerializer):
    """
    ML model version serializer. Excludes model_file_path for security.
    """

    class Meta:
        model = MLModel
        fields = [
            "id",
            "name",
            "version",
            "model_type",
            "architecture",
            "accuracy",
            "precision",
            "recall",
            "f1_score",
            "training_date",
            "training_samples",
            "is_active",
            "uploaded_at",
            "notes",
            "changelog",
        ]
        read_only_fields = ["uploaded_at"]


class ProductInteractionSerializer(serializers.ModelSerializer):
    """Serializer for customer product interaction records."""

    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductInteraction
        fields = [
            "id",
            "product_id",
            "product_name",
            "interaction_type",
            "quantity",
            "created_at",
        ]
        read_only_fields = fields


class RecommendationItemSerializer(serializers.Serializer):
    """
    Serializer for a single recommendation item in the hybrid response.
    Includes XAI explanation at the product level.
    """

    product_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    producer_name = serializers.SerializerMethodField()
    score = serializers.FloatField(read_only=True)
    reason = serializers.CharField(read_only=True)
    quality_grade = serializers.CharField(
        allow_null=True, read_only=True
    )
    quality_boosted = serializers.BooleanField(
        source="quality_boosted", read_only=True
    )
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.FloatField(read_only=True)

    def get_product_id(self, obj):
        return obj["product"].id

    def get_product_name(self, obj):
        return obj["product"].name

    def get_price(self, obj):
        return str(obj["product"].price)

    def get_producer_name(self, obj):
        p = obj["product"].producer
        return p.get_full_name() or p.email


class SurplusDealSerializer(serializers.Serializer):
    """Serializer for surplus/discounted product deals."""

    product_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    producer_name = serializers.SerializerMethodField()
    discount_percentage = serializers.FloatField(read_only=True)
    grade = serializers.CharField(read_only=True)
    assessed_at = serializers.DateTimeField(read_only=True)

    def get_product_id(self, obj):
        return obj["product"].id

    def get_product_name(self, obj):
        return obj["product"].name

    def get_price(self, obj):
        return str(obj["product"].price)

    def get_producer_name(self, obj):
        p = obj["product"].producer
        return p.get_full_name() or p.email


class QuickReorderSerializer(serializers.Serializer):
    """Serializer for quick-reorder suggestions."""

    product_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    last_ordered = serializers.DateTimeField(read_only=True)
    times_ordered = serializers.IntegerField(read_only=True)
    available = serializers.BooleanField(read_only=True)
    stock_level = serializers.IntegerField(read_only=True)
    quick_add_url = serializers.CharField(read_only=True)

    def get_product_id(self, obj):
        return obj["product"].id

    def get_product_name(self, obj):
        return obj["product"].name

    def get_price(self, obj):
        return str(obj["product"].price)


class EvaluationReportSerializer(serializers.ModelSerializer):
    """Serializer for model evaluation reports with parsed confusion matrix."""

    confusion_matrix = serializers.SerializerMethodField()
    model_name = serializers.CharField(
        source="ml_model.name", read_only=True
    )
    model_version = serializers.CharField(
        source="ml_model.version", read_only=True
    )

    class Meta:
        model = ModelEvaluationReport
        fields = [
            "id",
            "model_name",
            "model_version",
            "evaluated_at",
            "test_samples",
            "accuracy",
            "precision",
            "recall",
            "f1_score",
            "grade_a_accuracy",
            "grade_b_accuracy",
            "grade_c_accuracy",
            "confusion_matrix",
            "override_rate",
            "notes",
        ]
        read_only_fields = fields

    def get_confusion_matrix(self, obj):
        """Return parsed confusion matrix dict."""
        return obj.get_confusion_matrix()
