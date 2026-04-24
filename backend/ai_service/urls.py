# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
AI Service URL Configuration
==============================
All endpoints are mounted under /api/ai/ in the root urls.py.
JWT authentication is enforced at the view level via IsAuthenticated.
"""

from django.urls import path

from ai_service.views import (
    AssessProductView,
    QualityHistoryView,
    ExplanationView,
    RecommendationView,
    OverrideView,
    QuickReorderView,
    ModelUploadView,
    AdminInsightsView,
    ProducerInsightsView,
    EvaluationReportView,
    EvaluationFiguresView,
    GDPRDeleteView,
)

urlpatterns = [
    # Quality assessment endpoints (producer).
    path("quality/assess/", AssessProductView.as_view(), name="ai-quality-assess"),
    path("quality/history/", QualityHistoryView.as_view(), name="ai-quality-history"),
    path(
        "quality/<int:assessment_id>/explanation/",
        ExplanationView.as_view(),
        name="ai-quality-explanation",
    ),

    # Recommendation endpoints (customer).
    path("recommendations/", RecommendationView.as_view(), name="ai-recommendations"),
    path(
        "recommendations/override/",
        OverrideView.as_view(),
        name="ai-recommendations-override",
    ),
    path(
        "recommendations/quick-reorder/",
        QuickReorderView.as_view(),
        name="ai-quick-reorder",
    ),

    # Model management (admin).
    path("models/upload/", ModelUploadView.as_view(), name="ai-model-upload"),

    # Insights and reporting.
    path("admin/insights/", AdminInsightsView.as_view(), name="ai-admin-insights"),
    path(
        "producer/insights/",
        ProducerInsightsView.as_view(),
        name="ai-producer-insights",
    ),
    path(
        "evaluation/report/",
        EvaluationReportView.as_view(),
        name="ai-evaluation-report",
    ),
    path(
        "evaluation/figures/",
        EvaluationFiguresView.as_view(),
        name="ai-evaluation-figures",
    ),

    # GDPR.
    path("gdpr/delete/", GDPRDeleteView.as_view(), name="ai-gdpr-delete"),
]
