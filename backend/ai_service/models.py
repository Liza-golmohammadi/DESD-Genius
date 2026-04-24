from django.db import models
from django.conf import settings
from products.models import Product


class MLModel(models.Model):
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50)
    file_path = models.CharField(max_length=500)
    metadata_path = models.CharField(max_length=500, blank=True, null=True)

    is_active = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (v{self.version})"


class QualityAssessment(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="assessments")
    producer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # 🔥 AI OUTPUT
    predicted_label = models.CharField(max_length=50)  # Healthy / Rotten
    rotten_probability = models.FloatField()
    confidence = models.FloatField()

    #  BUSINESS LAYER (A/B/C)
    grade = models.CharField(max_length=1)  # A / B / C

    # metadata
    model = models.ForeignKey(MLModel, on_delete=models.SET_NULL, null=True)
    mode = models.CharField(max_length=20, default="mock")  # mock / live

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.grade} ({self.predicted_label})"