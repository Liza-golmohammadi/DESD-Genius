from django.urls import path
from .views import ProductQualityAssessmentView

urlpatterns = [
    path("assess/", ProductQualityAssessmentView.as_view(), name="product-assess"),
]