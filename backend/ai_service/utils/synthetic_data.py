# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
Synthetic Data Generator
=========================
Generates realistic synthetic interaction and quality assessment data
for development, testing, and model evaluation.

Buyer segment distribution mirrors the case study specification:
  - 20% heavy buyers (10+ purchases)
  - 50% regular buyers (3-9 purchases)
  - 30% occasional buyers (1-2 purchases)
"""

import random
import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from products.models import Product
from ai_service.models import (
    QualityAssessment,
    ProductInteraction,
    GRADE_A_THRESHOLDS,
    GRADE_B_THRESHOLDS,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class SyntheticDataGenerator:
    """
    Generates synthetic training and evaluation data for the AI module.

    All generated data is flagged with is_mock=True on QualityAssessment
    records so that EvaluationService can distinguish mock from real data.
    """

    # Score ranges for each simulated grade (mean, std_dev).
    _GRADE_SCORE_PARAMS = {
        "A": {
            "colour": (88.0, 4.0),
            "size": (91.0, 3.0),
            "ripeness": (83.0, 4.0),
        },
        "B": {
            "colour": (77.0, 3.0),
            "size": (82.0, 3.0),
            "ripeness": (73.0, 3.0),
        },
        "C": {
            "colour": (62.0, 4.0),
            "size": (67.0, 4.0),
            "ripeness": (58.0, 4.0),
        },
    }

    @staticmethod
    def generate_order_interactions(num_customers=50, num_interactions=500):
        """
        Simulate realistic customer purchase interaction patterns.

        Creates ProductInteraction records for existing customers and
        products following the three buyer segments from the case study.

        Args:
            num_customers (int): Maximum number of customers to use.
            num_interactions (int): Total interactions to create.

        Returns:
            dict: {'created': int, 'skipped': int}
        """
        customers = list(
            User.objects.filter(role="customer", is_active=True)[
                :num_customers
            ]
        )
        products = list(Product.objects.filter(is_available=True))

        if not customers or not products:
            logger.warning(
                "No customers or products found. Skipping interaction generation."
            )
            return {"created": 0, "skipped": 0}

        created = 0
        skipped = 0

        for customer in customers:
            # Assign buyer segment.
            segment_roll = random.random()
            if segment_roll < 0.2:
                n_purchases = random.randint(10, 20)  # Heavy buyer.
            elif segment_roll < 0.7:
                n_purchases = random.randint(3, 9)    # Regular buyer.
            else:
                n_purchases = random.randint(1, 2)    # Occasional buyer.

            # Category preference: some customers prefer specific categories.
            preferred_products = (
                random.sample(products, min(5, len(products)))
                if random.random() < 0.4
                else products
            )

            for _ in range(n_purchases):
                product = random.choice(preferred_products)
                interaction_type = random.choices(
                    ["purchased", "reordered", "viewed", "added_to_cart"],
                    weights=[0.5, 0.2, 0.2, 0.1],
                )[0]

                try:
                    ProductInteraction.objects.create(
                        customer=customer,
                        product=product,
                        interaction_type=interaction_type,
                        quantity=random.randint(1, 3),
                    )
                    created += 1
                except Exception as exc:
                    logger.debug("Skipped interaction: %s", exc)
                    skipped += 1

        logger.info(
            "Synthetic interactions: created=%d skipped=%d", created, skipped
        )
        return {"created": created, "skipped": skipped}

    @staticmethod
    def generate_quality_assessments(num_per_product=3):
        """
        Create synthetic quality assessments for all products.

        Grade distribution: 60% A, 30% B, 10% C — mirrors case study spec.
        Gaussian noise is applied to score means to create realistic variance.

        Args:
            num_per_product (int): Number of assessments per product.

        Returns:
            dict: {'created': int, 'products_assessed': int}
        """
        products = list(Product.objects.select_related("producer"))
        grade_weights = [("A", 0.6), ("B", 0.3), ("C", 0.1)]

        created = 0
        products_assessed = 0

        for product in products:
            products_assessed += 1
            for _ in range(num_per_product):
                # Sample grade.
                roll = random.random()
                cumulative = 0.0
                grade = "A"
                for g, prob in grade_weights:
                    cumulative += prob
                    if roll <= cumulative:
                        grade = g
                        break

                params = SyntheticDataGenerator._GRADE_SCORE_PARAMS[grade]
                colour = max(0.0, min(100.0, random.gauss(
                    *params["colour"]
                )))
                size = max(0.0, min(100.0, random.gauss(*params["size"])))
                ripeness = max(0.0, min(100.0, random.gauss(
                    *params["ripeness"]
                )))

                # Re-derive grade from actual scores for consistency.
                derived_grade = QualityAssessment.compute_grade(
                    colour, size, ripeness
                )

                if derived_grade == "C":
                    discount = 30.0
                    auto_discount = True
                elif derived_grade == "B":
                    discount = 15.0
                    auto_discount = True
                else:
                    discount = 0.0
                    auto_discount = False

                QualityAssessment.objects.create(
                    product=product,
                    producer=product.producer,
                    colour_score=round(colour, 2),
                    size_score=round(size, 2),
                    ripeness_score=round(ripeness, 2),
                    overall_grade=derived_grade,
                    confidence=round(random.uniform(0.75, 0.97), 4),
                    auto_discount_applied=auto_discount,
                    discount_percentage=discount,
                    is_mock=True,
                    model_version="v1.0-mock-synthetic",
                )
                created += 1

        logger.info(
            "Synthetic assessments: created=%d for %d products",
            created, products_assessed,
        )
        return {"created": created, "products_assessed": products_assessed}

    @staticmethod
    def generate_model_evaluation_data(num_test_samples=200):
        """
        Create synthetic ground-truth classification data for evaluation.

        Args:
            num_test_samples (int): Number of synthetic test samples.

        Returns:
            dict: Classification report data suitable for EvaluationService.
        """
        grades = ["A", "B", "C"]
        grade_weights = [0.6, 0.3, 0.1]

        predicted = []
        ground_truth = []

        # Simulate ~90% accuracy with some off-by-one grade errors.
        for _ in range(num_test_samples):
            true_grade = random.choices(grades, weights=grade_weights)[0]
            if random.random() < 0.90:
                pred_grade = true_grade
            else:
                # Introduce plausible confusion: A↔B or B↔C.
                errors = {
                    "A": ["B"],
                    "B": ["A", "C"],
                    "C": ["B"],
                }
                pred_grade = random.choice(errors[true_grade])
            ground_truth.append(true_grade)
            predicted.append(pred_grade)

        correct = sum(p == t for p, t in zip(predicted, ground_truth))
        accuracy = round(correct / num_test_samples, 4)

        return {
            "num_samples": num_test_samples,
            "accuracy": accuracy,
            "predicted": predicted,
            "ground_truth": ground_truth,
        }
