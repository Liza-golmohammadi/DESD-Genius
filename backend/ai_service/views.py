# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
AI Service API Views
====================
All views require JWT authentication via IsAuthenticated.
Role guards are applied at the view level using request.user.role.

Endpoints follow the URL structure defined in ai_service/urls.py.
"""

import os
import base64

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ai_service.models import (
    QualityAssessment,
    MLModel,
    ProductInteraction,
)
from ai_service.serializers import (
    QualityAssessmentSerializer,
    QualityAssessmentListSerializer,
    MLModelSerializer,
    EvaluationReportSerializer,
)
from ai_service.services.quality_classifier import QualityClassifierService
from ai_service.services.recommendation_engine import RecommendationEngine
from ai_service.services.hybrid_engine import HybridEngine
from ai_service.services.evaluation import EvaluationService
from ai_service.services.fairness import FairnessService
from ai_service.services.xai_service import XAIService
from products.models import Product


# ---------------------------------------------------------------------------
# Quality Assessment Views
# ---------------------------------------------------------------------------


class AssessProductView(APIView):
    """
    POST /api/ai/quality/assess/

    Runs the quality classifier on a product and returns the assessment
    with a full XAI explanation. Producer role required.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Assess product quality and return graded result with explanation."""
        if request.user.role != "producer":
            return Response(
                {"error": "Only producers can assess product quality."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product_id = request.data.get("product_id")
        image_url = request.data.get("image_url", "")

        if not product_id:
            return Response(
                {"error": "product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assessment = QualityClassifierService.assess_product(
                product_id=int(product_id),
                producer_user=request.user,
                image_url=image_url or None,
            )
        except PermissionError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_403_FORBIDDEN
            )
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (ValueError, TypeError) as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QualityAssessmentSerializer(assessment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QualityHistoryView(APIView):
    """
    GET /api/ai/quality/history/

    Returns quality assessment history for the requesting producer.
    Query param: ?days=30 (default 30).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return recent quality assessments and grade statistics."""
        if request.user.role != "producer":
            return Response(
                {"error": "Only producers can view quality history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        days = int(request.query_params.get("days", 30))
        qs = QualityClassifierService.get_assessment_history(
            request.user, days_back=days
        )
        stats = QualityClassifierService.get_grade_statistics(request.user)
        serializer = QualityAssessmentListSerializer(qs, many=True)

        return Response(
            {
                "assessments": serializer.data,
                "grade_statistics": stats,
                "days_shown": days,
            }
        )


class ExplanationView(APIView):
    """
    GET /api/ai/quality/<assessment_id>/explanation/

    Returns the full two-tier XAI explanation for a quality assessment.
    Producer must own the assessment.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, assessment_id):
        """Return technical and non-technical XAI explanation."""
        if request.user.role != "producer":
            return Response(
                {"error": "Only producers can view quality explanations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            assessment = QualityAssessment.objects.select_related(
                "product"
            ).get(id=assessment_id)
        except QualityAssessment.DoesNotExist:
            return Response(
                {"error": "Assessment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if assessment.producer_id != request.user.id:
            return Response(
                {"error": "You do not own this assessment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        explanation = XAIService.generate_explanation(assessment)
        return Response(explanation)


# ---------------------------------------------------------------------------
# Recommendation Views
# ---------------------------------------------------------------------------


class RecommendationView(APIView):
    """
    GET /api/ai/recommendations/

    Returns the full hybrid recommendation payload for the requesting
    customer. Logs a 'viewed' interaction for each recommended product.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return personalised hybrid recommendations."""
        if request.user.role != "customer":
            return Response(
                {"error": "Recommendations are only available to customers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = HybridEngine.get_full_recommendation_response(request.user)

        # Log viewed interactions for each recommended product.
        for rec in payload.get("recommendations", []):
            try:
                ProductInteraction.log_interaction(
                    customer=request.user,
                    product=rec["product"],
                    interaction_type="viewed",
                )
            except Exception:
                pass

        # Serialise nested objects.
        from ai_service.serializers import (
            RecommendationItemSerializer,
            QuickReorderSerializer,
            SurplusDealSerializer,
        )

        return Response(
            {
                "recommendations": RecommendationItemSerializer(
                    payload["recommendations"], many=True
                ).data,
                "quick_reorder": QuickReorderSerializer(
                    payload["quick_reorder"], many=True
                ).data,
                "surprise": (
                    {
                        "product_id": payload["surprise"]["product"].id,
                        "product_name": payload["surprise"]["product"].name,
                        "label": payload["surprise"]["label"],
                        "reason": payload["surprise"]["reason"],
                        "quality_grade": payload["surprise"]["quality_grade"],
                    }
                    if payload.get("surprise")
                    else None
                ),
                "surplus_deals": SurplusDealSerializer(
                    payload["surplus_deals"], many=True
                ).data,
                "generated_at": payload["generated_at"],
                "algorithm": payload["algorithm"],
                "quality_filter_active": payload["quality_filter_active"],
                "products_boosted": payload["products_boosted"],
                "products_suppressed": payload["products_suppressed"],
                "personalisation_score": payload["personalisation_score"],
            }
        )


class OverrideView(APIView):
    """
    POST /api/ai/recommendations/override/

    Logs that a customer overrode a recommendation. Reason is required.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Log a recommendation override with mandatory reason."""
        if request.user.role != "customer":
            return Response(
                {"error": "Only customers can override recommendations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        product_id = request.data.get("product_id")
        reason = request.data.get("reason", "").strip()

        if not product_id:
            return Response(
                {"error": "product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not reason:
            return Response(
                {"error": "reason is required for recommendation overrides."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            ProductInteraction.log_interaction(
                customer=request.user,
                product=product,
                interaction_type="overrode_recommendation",
                override_reason=reason,
            )
        except ValueError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "acknowledged": True,
                "message": (
                    "Override recorded. Your feedback helps us improve "
                    "future recommendations."
                ),
            }
        )


class QuickReorderView(APIView):
    """
    GET /api/ai/recommendations/quick-reorder/

    Returns recently purchased products with availability check.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return quick-reorder suggestions with stock status."""
        if request.user.role != "customer":
            return Response(
                {"error": "Only customers can use quick reorder."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from ai_service.serializers import QuickReorderSerializer

        suggestions = RecommendationEngine.get_quick_reorder(request.user)
        return Response(QuickReorderSerializer(suggestions, many=True).data)


# ---------------------------------------------------------------------------
# Model Management Views
# ---------------------------------------------------------------------------


class ModelUploadView(APIView):
    """
    POST /api/ai/models/upload/

    Allows admins to register a new ML model version. Admin role only.
    The model file should be uploaded to the server separately and the
    file path provided in the request body.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Register and optionally activate a new ML model."""
        if request.user.role != "admin":
            return Response(
                {"error": "Only admins can upload ML models."},
                status=status.HTTP_403_FORBIDDEN,
            )

        required = ["name", "version", "model_type", "model_file_path"]
        for field in required:
            if not request.data.get(field):
                return Response(
                    {"error": f"{field} is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        ml_model = MLModel.objects.create(
            name=request.data["name"],
            version=request.data["version"],
            model_type=request.data["model_type"],
            model_file_path=request.data["model_file_path"],
            architecture=request.data.get("architecture", ""),
            accuracy=request.data.get("accuracy"),
            f1_score=request.data.get("f1_score"),
            is_active=request.data.get("activate", False),
            uploaded_by=request.user,
            notes=request.data.get("notes", ""),
            changelog=request.data.get("changelog", ""),
        )

        return Response(
            MLModelSerializer(ml_model).data, status=status.HTTP_201_CREATED
        )


# ---------------------------------------------------------------------------
# Admin and Reporting Views
# ---------------------------------------------------------------------------


class AdminInsightsView(APIView):
    """
    GET /api/ai/admin/insights/

    Network-wide AI statistics for the admin dashboard. Admin only.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return network-wide AI insights and encoded charts."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        insights = HybridEngine.get_admin_insights()
        return Response(insights)


class ProducerInsightsView(APIView):
    """
    GET /api/ai/producer/insights/

    Producer-specific quality and revenue insights. Producer only.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return producer dashboard data including quality trend chart."""
        if request.user.role != "producer":
            return Response(
                {"error": "Producer access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = HybridEngine.get_producer_dashboard_data(request.user)
        return Response(data)


class EvaluationReportView(APIView):
    """
    GET /api/ai/evaluation/report/

    Triggers a full model evaluation and returns the metrics report.
    Also creates a ModelEvaluationReport record. Admin only.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Evaluate the active model and return metrics."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        report_data = EvaluationService.evaluate_classifier(
            evaluator=request.user
        )
        return Response(report_data)


class EvaluationFiguresView(APIView):
    """
    GET /api/ai/evaluation/figures/

    Generates all matplotlib evaluation figures and returns them as
    base64-encoded PNG strings for embedding in the technical report.
    Admin only.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Generate evaluation figures and return as base64 strings."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = EvaluationService.generate_evaluation_figures(tmpdir)
            figures = []
            for path in paths:
                try:
                    with open(path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("utf-8")
                    figures.append(
                        {
                            "filename": os.path.basename(path),
                            "data": b64,
                            "format": "png",
                        }
                    )
                except Exception:
                    pass

        return Response(
            {"figures": figures, "count": len(figures)}
        )


# ---------------------------------------------------------------------------
# GDPR View
# ---------------------------------------------------------------------------


class GDPRDeleteView(APIView):
    """
    POST /api/ai/gdpr/delete/

    Implements GDPR Article 17 right to erasure for AI-specific data.
    Available to any authenticated user for their own records.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Delete all AI interaction data for the requesting user."""
        result = FairnessService.delete_customer_data(request.user)
        return Response(
            {
                "deleted": True,
                "summary": result,
                "gdpr_info": FairnessService.get_gdpr_summary(),
            }
        )
