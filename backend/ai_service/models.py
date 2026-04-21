# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
AI Service Models
=================
Defines the data layer for the hybrid quality-aware recommendation
system. Five models cover quality assessment records, ML model
versioning, user interaction tracking, recommendation logging,
and evaluation reports.

Module-level constants are used throughout the services layer so
that grading thresholds and hybrid weights are never hardcoded.
"""

import json

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.contrib.auth import get_user_model

from products.models import Product

User = get_user_model()

# ---------------------------------------------------------------------------
# Grading threshold constants
# ---------------------------------------------------------------------------

# Grade A: premium quality — ALL scores must meet these thresholds.
GRADE_A_THRESHOLDS = {"colour": 85.0, "size": 90.0, "ripeness": 80.0}

# Grade B: acceptable quality — ALL scores must meet these thresholds.
GRADE_B_THRESHOLDS = {"colour": 75.0, "size": 80.0, "ripeness": 70.0}

# Grade C: below standard — any score below Grade B threshold.
GRADE_C_THRESHOLDS = {"colour": 65.0, "size": 70.0, "ripeness": 60.0}

# Discount rates applied automatically by grade (business rule).
GRADE_B_DISCOUNT = 15.0
GRADE_C_DISCOUNT = 30.0

# ---------------------------------------------------------------------------
# Hybrid engine weighting constants
# ---------------------------------------------------------------------------

# CNN quality grades modify recommendation frequency scores.
QUALITY_A_BOOST = 1.3     # Grade A products boosted in recommendations.
QUALITY_B_WEIGHT = 1.0    # Grade B products unchanged.
QUALITY_C_SUPPRESS = 0.0  # Grade C products suppressed from recommendations.
COLLAB_WEIGHT = 0.3       # Weight added by collaborative filtering signal.


class QualityAssessment(models.Model):
    """
    Records the outcome of a CNN-based quality assessment for a product.

    Each assessment captures colour, size, and ripeness scores produced
    by the quality classifier, derives an overall grade (A/B/C), and
    records whether an automatic discount was applied.

    The is_mock flag distinguishes production CNN assessments from
    synthetic mock assessments generated during development, allowing
    evaluation metrics to filter mock records when needed.

    Role in hybrid architecture: quality grades stored here are read by
    RecommendationEngine to apply QUALITY_A_BOOST / QUALITY_C_SUPPRESS
    weight modifiers, forming the CNN→recommendation integration point.
    """

    GRADE_CHOICES = [
        ("A", "Grade A"),
        ("B", "Grade B"),
        ("C", "Grade C"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="quality_assessments",
    )
    producer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "producer"},
        related_name="quality_assessments",
    )
    image_url = models.CharField(max_length=500, blank=True, default="")
    colour_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    size_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    ripeness_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    overall_grade = models.CharField(max_length=1, choices=GRADE_CHOICES)
    confidence = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    grad_cam_image_url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Path to Grad-CAM heatmap image for XAI visualisation.",
    )
    auto_discount_applied = models.BooleanField(default=False)
    discount_percentage = models.FloatField(default=0.0)
    assessed_at = models.DateTimeField(auto_now_add=True)
    model_version = models.CharField(max_length=50, default="v1.0-mock")
    is_mock = models.BooleanField(
        default=True,
        help_text="True if assessed by mock model; False if assessed by real CNN.",
    )

    class Meta:
        verbose_name = "Quality Assessment"
        verbose_name_plural = "Quality Assessments"
        ordering = ["-assessed_at"]

    def __str__(self):
        return (
            f"{self.product.name} — Grade {self.overall_grade} "
            f"({self.assessed_at.strftime('%Y-%m-%d')})"
        )

    @classmethod
    def compute_grade(cls, colour, size, ripeness):
        """
        Derive an overall quality grade from individual attribute scores.

        Implements the three-tier grading logic from the BRFN case study.
        Exposed as a classmethod so it can be unit-tested independently
        of any model instance and reused by the quality classifier service.

        Args:
            colour (float): Colour uniformity score 0–100.
            size (float): Size consistency score 0–100.
            ripeness (float): Ripeness index score 0–100.

        Returns:
            str: 'A', 'B', or 'C'.
        """
        if (
            colour >= GRADE_A_THRESHOLDS["colour"]
            and size >= GRADE_A_THRESHOLDS["size"]
            and ripeness >= GRADE_A_THRESHOLDS["ripeness"]
        ):
            return "A"
        if (
            colour >= GRADE_B_THRESHOLDS["colour"]
            and size >= GRADE_B_THRESHOLDS["size"]
            and ripeness >= GRADE_B_THRESHOLDS["ripeness"]
        ):
            return "B"
        return "C"

    def get_grade_breakdown(self):
        """
        Return a structured breakdown of scores versus thresholds.

        Identifies the weakest attribute (the one that caused a downgrade)
        and generates a plain-English explanation for the XAI layer and
        non-technical producer audience.

        Returns:
            dict: Per-attribute scores with threshold comparisons,
                  weakest_attribute, plain-English explanation,
                  confidence, and is_mock flag.
        """
        scores = {
            "colour": self.colour_score,
            "size": self.size_score,
            "ripeness": self.ripeness_score,
        }
        breakdown = {}
        for attr, score in scores.items():
            breakdown[attr] = {
                "score": round(score, 1),
                "threshold_a": GRADE_A_THRESHOLDS[attr],
                "threshold_b": GRADE_B_THRESHOLDS[attr],
                "passed_a": score >= GRADE_A_THRESHOLDS[attr],
                "passed_b": score >= GRADE_B_THRESHOLDS[attr],
            }

        # Identify the attribute furthest below its Grade A threshold.
        deficits = {
            attr: GRADE_A_THRESHOLDS[attr] - scores[attr]
            for attr in scores
        }
        weakest = max(deficits, key=deficits.get)

        # Build a human-readable explanation.
        if self.overall_grade == "A":
            explanation = (
                "Grade A awarded. All scores met the premium thresholds: "
                f"colour {self.colour_score:.1f}%, "
                f"size {self.size_score:.1f}%, "
                f"ripeness {self.ripeness_score:.1f}%."
            )
        elif self.overall_grade == "B":
            w_score = scores[weakest]
            w_threshold = GRADE_A_THRESHOLDS[weakest]
            passing = [a for a in scores if a != weakest]
            explanation = (
                f"Grade B awarded. {weakest.capitalize()} score "
                f"({w_score:.1f}%) fell below the Grade A threshold of "
                f"{w_threshold:.1f}%. "
                f"{' and '.join(p.capitalize() for p in passing)} "
                "met Grade A standards."
            )
        else:
            failing = [
                a for a in scores
                if scores[a] < GRADE_B_THRESHOLDS[a]
            ]
            explanation = (
                "Grade C awarded. The following scores fell below the "
                f"Grade B threshold: "
                f"{', '.join(a.capitalize() for a in failing)}. "
                f"A {GRADE_C_DISCOUNT:.0f}% discount has been applied."
            )

        return {
            "colour": breakdown["colour"],
            "size": breakdown["size"],
            "ripeness": breakdown["ripeness"],
            "overall_grade": self.overall_grade,
            "weakest_attribute": weakest,
            "explanation": explanation,
            "confidence": round(self.confidence, 3),
            "is_mock": self.is_mock,
        }

    def get_discount_recommendation(self):
        """
        Return a discount recommendation based on the assessed grade.

        Returns:
            dict: apply_discount flag, percentage, human-readable reason,
                  and urgency level for the producer dashboard.
        """
        if self.overall_grade == "C":
            return {
                "apply_discount": True,
                "discount_percentage": GRADE_C_DISCOUNT,
                "reason": (
                    "Grade C produce requires a significant discount "
                    "to move stock quickly and reduce waste."
                ),
                "urgency": "high",
            }
        if self.overall_grade == "B":
            return {
                "apply_discount": True,
                "discount_percentage": GRADE_B_DISCOUNT,
                "reason": (
                    "Grade B produce benefits from a moderate discount "
                    "to remain competitive against premium Grade A stock."
                ),
                "urgency": "medium",
            }
        return {
            "apply_discount": False,
            "discount_percentage": 0.0,
            "reason": "Grade A produce — no discount needed.",
            "urgency": "none",
        }


class MLModel(models.Model):
    """
    Tracks versioned machine learning model files and their performance metrics.

    When a new model is activated (is_active=True) the save() override
    automatically deactivates all other models of the same type within a
    database transaction, ensuring only one active model per type at
    any given time.

    This design supports the model lifecycle described in ml_models/README.md:
    train → evaluate → upload → activate → monitor → retrain.
    """

    MODEL_TYPE_CHOICES = [
        ("quality_classifier", "Quality Classifier"),
        ("recommendation", "Recommendation Engine"),
    ]

    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50)
    model_file_path = models.CharField(max_length=500)
    model_type = models.CharField(max_length=30, choices=MODEL_TYPE_CHOICES)
    architecture = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g. MobileNetV2, ResNet50, CollabFilter",
    )
    accuracy = models.FloatField(null=True, blank=True)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    training_date = models.DateField(null=True, blank=True)
    training_samples = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="uploaded_models"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    changelog = models.TextField(
        blank=True,
        help_text="What changed from the previous version.",
    )

    class Meta:
        verbose_name = "ML Model"
        verbose_name_plural = "ML Models"
        ordering = ["-uploaded_at"]

    def __str__(self):
        status = "ACTIVE" if self.is_active else "inactive"
        return f"{self.name} v{self.version} ({self.model_type}) [{status}]"

    def save(self, *args, **kwargs):
        """
        Override save to enforce single-active-model constraint per type.

        When is_active is set to True, all other MLModel records with
        the same model_type are deactivated atomically to prevent split
        brain between model versions.
        """
        if self.is_active:
            with transaction.atomic():
                MLModel.objects.filter(
                    model_type=self.model_type, is_active=True
                ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class ProductInteraction(models.Model):
    """
    Records every significant customer interaction with a product.

    Interaction data is the primary input to the collaborative
    filtering component of the hybrid recommendation engine.
    The override_recommendation and dismissed_recommendation types
    provide fairness signals — high override rates indicate the
    recommendation engine is not aligned with user preferences.

    GDPR note: This model stores personal behavioural data linked
    to identified users. Records can be deleted via the GDPR
    right-to-erasure endpoint at /api/ai/gdpr/delete/.
    """

    INTERACTION_CHOICES = [
        ("viewed", "Viewed"),
        ("added_to_cart", "Added to Cart"),
        ("purchased", "Purchased"),
        ("reordered", "Reordered"),
        ("overrode_recommendation", "Overrode Recommendation"),
        ("dismissed_recommendation", "Dismissed Recommendation"),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "customer"},
        related_name="interactions",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="interactions",
    )
    interaction_type = models.CharField(
        max_length=30, choices=INTERACTION_CHOICES
    )
    override_reason = models.TextField(blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    session_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Groups interactions belonging to one browsing session.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Product Interaction"
        verbose_name_plural = "Product Interactions"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.customer.email} — {self.interaction_type} — "
            f"{self.product.name}"
        )

    @classmethod
    def log_interaction(
        cls,
        customer,
        product,
        interaction_type,
        quantity=1,
        override_reason="",
        session_id="",
    ):
        """
        Create and return a ProductInteraction record.

        Args:
            customer: User instance with role='customer'.
            product: Product instance.
            interaction_type (str): One of INTERACTION_CHOICES keys.
            quantity (int): Number of units involved.
            override_reason (str): Required when type is
                'overrode_recommendation'.
            session_id (str): Optional session grouping key.

        Returns:
            ProductInteraction: The newly created record.

        Raises:
            ValueError: If override_reason is missing for override type.
        """
        if (
            interaction_type == "overrode_recommendation"
            and not override_reason
        ):
            raise ValueError(
                "override_reason is required for recommendation overrides."
            )
        return cls.objects.create(
            customer=customer,
            product=product,
            interaction_type=interaction_type,
            quantity=quantity,
            override_reason=override_reason,
            session_id=session_id,
        )


class RecommendationLog(models.Model):
    """
    Persists a record of each recommendation set generated for a customer.

    Tracks which algorithm variant was used, how many products were
    boosted or suppressed by quality weighting, and what weights were
    applied. Used by EvaluationService to calculate override rates and
    by FairnessService to detect producer representation bias.
    """

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recommendation_logs",
    )
    recommended_products = models.ManyToManyField(
        Product,
        related_name="recommendation_logs",
        blank=True,
    )
    quality_filter_applied = models.BooleanField(default=True)
    algorithm_used = models.CharField(
        max_length=100,
        default="hybrid_quality_aware_collaborative",
    )
    frequency_weight = models.FloatField(default=1.0)
    collaborative_weight = models.FloatField(default=COLLAB_WEIGHT)
    quality_boost_applied = models.BooleanField(default=False)
    products_suppressed = models.IntegerField(
        default=0,
        help_text="Number of Grade C products suppressed from this run.",
    )
    products_boosted = models.IntegerField(
        default=0,
        help_text="Number of Grade A products boosted in this run.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Recommendation Log"
        verbose_name_plural = "Recommendation Logs"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Recommendations for {self.customer.email} "
            f"({self.created_at.strftime('%Y-%m-%d %H:%M')})"
        )


class ModelEvaluationReport(models.Model):
    """
    Stores the results of a formal model evaluation run.

    Generated by EvaluationService.evaluate_classifier() and surfaced
    via /api/ai/evaluation/report/. Per-grade accuracy fields allow
    assessment of whether the classifier performs consistently across
    all quality tiers (fairness check).

    The confusion_matrix_json field stores a JSON-serialised 3×3 matrix
    for grades A/B/C, enabling detailed error analysis in the report.
    """

    ml_model = models.ForeignKey(
        MLModel,
        on_delete=models.CASCADE,
        related_name="evaluation_reports",
    )
    evaluated_at = models.DateTimeField(auto_now_add=True)
    evaluated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="evaluations"
    )
    test_samples = models.IntegerField()
    accuracy = models.FloatField()
    precision = models.FloatField()
    recall = models.FloatField()
    f1_score = models.FloatField()
    grade_a_accuracy = models.FloatField(null=True, blank=True)
    grade_b_accuracy = models.FloatField(null=True, blank=True)
    grade_c_accuracy = models.FloatField(null=True, blank=True)
    confusion_matrix_json = models.TextField(
        blank=True,
        help_text="JSON-serialised 3×3 confusion matrix [A, B, C].",
    )
    override_rate = models.FloatField(
        null=True,
        blank=True,
        help_text="Percentage of recommendations overridden by users.",
    )
    notes = models.TextField(blank=True)
    figures_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Directory path for generated evaluation figures.",
    )

    class Meta:
        verbose_name = "Model Evaluation Report"
        verbose_name_plural = "Model Evaluation Reports"
        ordering = ["-evaluated_at"]

    def __str__(self):
        return (
            f"Evaluation — {self.ml_model.name} v{self.ml_model.version} "
            f"({self.evaluated_at.strftime('%Y-%m-%d')})"
        )

    def get_confusion_matrix(self):
        """Return the confusion matrix as a Python list, or empty list."""
        if not self.confusion_matrix_json:
            return []
        try:
            return json.loads(self.confusion_matrix_json)
        except (json.JSONDecodeError, ValueError):
            return []
