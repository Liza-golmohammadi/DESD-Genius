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


class ModelListView(APIView):
    """
    GET /api/ai/models/

    Returns all registered ML model versions with metadata.
    Admin role required.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List all ML model versions."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        models = MLModel.objects.all().order_by("-uploaded_at")
        return Response(MLModelSerializer(models, many=True).data)


class ModelActivateView(APIView):
    """
    POST /api/ai/models/<id>/activate/

    Activates a specific ML model version and deactivates others
    of the same type. Admin role required.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, model_id):
        """Activate an ML model by ID."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            ml_model = MLModel.objects.get(id=model_id)
        except MLModel.DoesNotExist:
            return Response(
                {"error": "Model not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        ml_model.is_active = True
        ml_model.save()  # save() override handles deactivating others
        return Response(MLModelSerializer(ml_model).data)


class InteractionExportView(APIView):
    """
    GET /api/ai/interactions/

    Returns all end-user interaction data for AI engineers to use
    in model refinement. Supports filtering by type, date range,
    and pagination. Admin role required.

    Query params:
        type: filter by interaction_type (e.g. purchased, viewed)
        days: limit to last N days (default: all)
        limit: max records (default: 500)
        offset: pagination offset (default: 0)
        format: 'csv' to get CSV download
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Export interaction data for model training."""
        if request.user.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = ProductInteraction.objects.all().select_related(
            "customer", "product", "product__category"
        ).order_by("-created_at")

        # Filter by interaction type.
        interaction_type = request.query_params.get("type")
        if interaction_type:
            qs = qs.filter(interaction_type=interaction_type)

        # Filter by date range.
        days = request.query_params.get("days")
        if days:
            from django.utils import timezone
            from datetime import timedelta
            cutoff = timezone.now() - timedelta(days=int(days))
            qs = qs.filter(created_at__gte=cutoff)

        total_count = qs.count()

        # Pagination.
        limit = min(int(request.query_params.get("limit", 500)), 5000)
        offset = int(request.query_params.get("offset", 0))
        page = qs[offset:offset + limit]

        # CSV export.
        export_format = request.query_params.get("format", "json")
        if export_format == "csv":
            import csv
            from django.http import HttpResponse
            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = (
                'attachment; filename="interactions_export.csv"'
            )
            writer = csv.writer(response)
            writer.writerow([
                "id", "customer_email", "product_id", "product_name",
                "category", "interaction_type", "quantity",
                "override_reason", "created_at",
            ])
            for i in page:
                writer.writerow([
                    i.id,
                    i.customer.email,
                    i.product_id,
                    i.product.name,
                    i.product.category.name if i.product.category else "",
                    i.interaction_type,
                    i.quantity,
                    i.override_reason,
                    i.created_at.isoformat(),
                ])
            return response

        # JSON response.
        records = []
        for i in page:
            records.append({
                "id": i.id,
                "customer_email": i.customer.email,
                "product_id": i.product_id,
                "product_name": i.product.name,
                "category": (
                    i.product.category.name if i.product.category else None
                ),
                "interaction_type": i.interaction_type,
                "quantity": i.quantity,
                "override_reason": i.override_reason,
                "created_at": i.created_at.isoformat(),
            })

        # Summary stats.
        from django.db.models import Count
        type_breakdown = dict(
            ProductInteraction.objects.values_list("interaction_type")
            .annotate(count=Count("id"))
            .values_list("interaction_type", "count")
        )

        return Response({
            "total_count": total_count,
            "returned": len(records),
            "offset": offset,
            "limit": limit,
            "type_breakdown": type_breakdown,
            "records": records,
        })


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
