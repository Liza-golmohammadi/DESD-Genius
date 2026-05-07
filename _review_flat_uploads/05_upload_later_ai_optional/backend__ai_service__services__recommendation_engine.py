# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
Quality-Aware Recommendation Engine
=====================================
Implements a HYBRID recommendation system combining:
  1. Frequency-based collaborative filtering (primary signal).
  2. CNN quality grade weighting (hybrid integration point).
  3. User-based collaborative filtering (secondary signal).

HYBRID DESIGN (for technical report):
The novelty of this system is that quality grades from the CNN
classifier are used as dynamic weight modifiers on the frequency-based
recommendation scores:
  - Grade A products are BOOSTED (×1.3) — best produce available.
  - Grade C products are SUPPRESSED (×0.0) — poor quality harms trust.
  - This creates a feedback loop: better quality → more recommendations
    → more sales → incentive to maintain quality practices.

FAIRNESS CONSIDERATION:
Quality weighting could disadvantage smaller producers with lower grades
due to less controlled growing conditions. See fairness.py for bias
detection. Producer-level bias is monitored via override rates.

ALTERNATIVE APPROACHES CONSIDERED:
  - Pure collaborative filtering: discarded — cold start problem is
    severe with limited order history in an early-stage marketplace.
  - Matrix factorisation (SVD): documented in ROADMAP.md as v1.2 upgrade
    once sufficient interaction volume (> 10k records) is available.
  - Content-based filtering: discarded — product descriptions lack
    sufficient richness for reliable similarity computation.
"""

import logging
from django.db.models import Count

from ai_service.models import (
    ProductInteraction,
    QualityAssessment,
    RecommendationLog,
    QUALITY_A_BOOST,
    QUALITY_B_WEIGHT,
    QUALITY_C_SUPPRESS,
    COLLAB_WEIGHT,
)
from products.models import Product

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Hybrid quality-aware collaborative recommendation engine.

    Pipeline: frequency scoring → quality weighting → collaborative
    signal → ranking → explanation generation → log creation.
    """

    @staticmethod
    def get_recommendations(customer_user, limit=10):
        """
        Generate personalised hybrid recommendations for a customer.

        Combines purchase frequency, CNN quality grades, and collaborative
        filtering from similar customers into a ranked list.

        Args:
            customer_user: User instance with role='customer'.
            limit (int): Maximum number of recommendations to return.

        Returns:
            list[dict]: Ranked recommendation dicts with explanations.
        """
        # Step 1 — Frequency scoring from purchase history.
        interactions = (
            ProductInteraction.objects.filter(
                customer=customer_user,
                interaction_type__in=["purchased", "reordered"],
            )
            .values("product_id")
            .annotate(freq=Count("id"))
        )
        frequency_scores = {
            row["product_id"]: row["freq"] for row in interactions
        }

        # Step 2 — Quality weighting (HYBRID INTEGRATION POINT).
        # CNN grade feeds into recommendation score as a multiplier.
        quality_weighted = {}
        boosted_count = 0
        suppressed_count = 0

        for product_id, freq in frequency_scores.items():
            latest = (
                QualityAssessment.objects.filter(product_id=product_id)
                .order_by("-assessed_at")
                .first()
            )
            grade = latest.overall_grade if latest else None

            if grade == "A":
                weight = QUALITY_A_BOOST
                boosted_count += 1
            elif grade == "B":
                weight = QUALITY_B_WEIGHT
            elif grade == "C":
                weight = QUALITY_C_SUPPRESS
                suppressed_count += 1
            else:
                weight = 1.0  # No assessment — neutral weight.

            quality_weighted[product_id] = {
                "score": freq * weight,
                "original_freq": freq,
                "quality_weight": weight,
                "grade": grade,
                "boosted": grade == "A",
            }

        # Step 3 — Collaborative signal from similar customers.
        # Find customers sharing >= 2 products with this customer.
        bought_ids = set(frequency_scores.keys())
        if bought_ids:
            similar_customers = (
                ProductInteraction.objects.filter(
                    product_id__in=bought_ids,
                    interaction_type__in=["purchased", "reordered"],
                )
                .exclude(customer=customer_user)
                .values("customer_id")
                .annotate(shared=Count("product_id", distinct=True))
                .filter(shared__gte=2)
                .values_list("customer_id", flat=True)
            )

            if similar_customers:
                collab_interactions = (
                    ProductInteraction.objects.filter(
                        customer_id__in=similar_customers,
                        interaction_type__in=["purchased", "reordered"],
                    )
                    .exclude(product_id__in=bought_ids)
                    .values("product_id")
                    .annotate(collab_freq=Count("id"))
                )

                for row in collab_interactions:
                    pid = row["product_id"]
                    collab_score = row["collab_freq"] * COLLAB_WEIGHT

                    # Check quality grade for collaborative products too.
                    latest = (
                        QualityAssessment.objects.filter(product_id=pid)
                        .order_by("-assessed_at")
                        .first()
                    )
                    grade = latest.overall_grade if latest else None
                    quality_weight = (
                        QUALITY_A_BOOST
                        if grade == "A"
                        else QUALITY_C_SUPPRESS
                        if grade == "C"
                        else 1.0
                    )

                    adjusted_score = collab_score * quality_weight
                    if pid in quality_weighted:
                        quality_weighted[pid]["score"] += adjusted_score
                    else:
                        quality_weighted[pid] = {
                            "score": adjusted_score,
                            "original_freq": 0,
                            "quality_weight": quality_weight,
                            "grade": grade,
                            "boosted": grade == "A",
                        }

        # Step 4 — Rank and filter suppressed products.
        ranked = sorted(
            [(pid, data) for pid, data in quality_weighted.items()
             if data["score"] > 0.0],
            key=lambda x: x[1]["score"],
            reverse=True,
        )[:limit]

        if not ranked:
            return []

        top_ids = [pid for pid, _ in ranked]
        products = {
            p.id: p
            for p in Product.objects.filter(
                id__in=top_ids
            ).select_related("producer", "category")
        }

        # Step 5 — Build response with explanations.
        results = []
        for product_id, data in ranked:
            product = products.get(product_id)
            if not product:
                continue

            # Build explanation string for XAI layer.
            if data["boosted"]:
                reason = (
                    "Grade A quality — one of the best available right now."
                )
            elif data["original_freq"] == 0:
                reason = "Customers with similar tastes also bought this."
            else:
                reason = "Based on your purchase history."

            results.append({
                "product": product,
                "score": round(data["score"], 3),
                "quality_boosted": data["boosted"],
                "quality_grade": data["grade"],
                "reason": reason,
                "has_discount": product.id in [
                    a.product_id for a in
                    QualityAssessment.objects.filter(
                        product_id=product_id,
                        auto_discount_applied=True,
                    ).order_by("-assessed_at")[:1]
                ],
                "discount_percentage": 0.0,
            })

        # Step 6 — Log the recommendation run.
        log = RecommendationLog.objects.create(
            customer=customer_user,
            quality_filter_applied=True,
            algorithm_used="hybrid_quality_aware_collaborative_v1",
            frequency_weight=1.0,
            collaborative_weight=COLLAB_WEIGHT,
            quality_boost_applied=boosted_count > 0,
            products_suppressed=suppressed_count,
            products_boosted=boosted_count,
        )
        if top_ids:
            log.recommended_products.set(
                Product.objects.filter(id__in=top_ids)
            )

        return results

    @staticmethod
    def get_quick_reorder(customer_user, limit=5):
        """
        Return the most recently purchased products for quick reorder.

        Checks current stock availability so the customer sees accurate
        availability status before attempting to add to cart.

        Args:
            customer_user: User instance with role='customer'.
            limit (int): Maximum number of suggestions to return.

        Returns:
            list[dict]: Recent product dicts with availability info.
        """
        recent = (
            ProductInteraction.objects.filter(
                customer=customer_user,
                interaction_type__in=["purchased", "reordered"],
            )
            .values("product_id")
            .annotate(
                times_ordered=Count("id"),
                last_ordered=__import__(
                    "django.db.models", fromlist=["Max"]
                ).Max("created_at"),
            )
            .order_by("-last_ordered")[:limit]
        )

        results = []
        for row in recent:
            try:
                product = Product.objects.get(id=row["product_id"])
            except Product.DoesNotExist:
                continue
            results.append({
                "product": product,
                "last_ordered": row["last_ordered"],
                "times_ordered": row["times_ordered"],
                "available": product.is_orderable(),
                "stock_level": product.stock_quantity,
                "quick_add_url": "/api/cart/items/",
            })
        return results

    @staticmethod
    def get_surprise_recommendation(customer_user):
        """
        Return one Grade A product the customer has never purchased.

        Implements the discovery feature from the case study — helps
        customers find new produce from the network.

        Args:
            customer_user: User instance with role='customer'.

        Returns:
            dict | None: Surprise recommendation dict or None if unavailable.
        """
        purchased_ids = set(
            ProductInteraction.objects.filter(
                customer=customer_user,
                interaction_type__in=["purchased", "reordered"],
            ).values_list("product_id", flat=True)
        )

        grade_a_ids = set(
            QualityAssessment.objects.filter(overall_grade="A")
            .values_list("product_id", flat=True)
        )

        candidates = list(grade_a_ids - purchased_ids)
        if not candidates:
            return None

        import random
        product_id = random.choice(candidates)
        try:
            product = Product.objects.select_related(
                "producer", "category"
            ).get(id=product_id, is_available=True, stock_quantity__gt=0)
        except Product.DoesNotExist:
            return None

        return {
            "product": product,
            "label": "Something new to try",
            "reason": (
                f"{product.name} from {product.producer.get_full_name()} "
                "has a Grade A quality rating and has not appeared in "
                "your order history — a great time to discover it."
            ),
            "quality_grade": "A",
        }
