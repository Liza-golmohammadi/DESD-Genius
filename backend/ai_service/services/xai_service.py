# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
"""
Explainable AI Service
========================
Provides transparency into model decisions for both technical and
non-technical audiences.

This addresses LO4: 'Demonstrate skills in evaluating systems and
presenting findings in ways appropriate to different audiences.'

TWO LEVELS OF EXPLANATION:
  1. Technical: confidence scores, feature attributions, Grad-CAM
     heatmaps, per-attribute threshold comparisons.
  2. Non-technical: plain-English summaries suitable for producers
     and the executive stakeholder demo.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Emoji badges map grade to a clear visual signal for the producer UI.
GRADE_EMOJI = {"A": "🟢", "B": "🟡", "C": "🔴"}


class XAIService:
    """
    Explainable AI layer for quality assessments and recommendations.

    Translates numerical model outputs into human-readable explanations
    at both technical depth (for the evaluation report) and plain-English
    depth (for the producer dashboard and non-technical demo audience).
    """

    @staticmethod
    def generate_explanation(quality_assessment):
        """
        Generate a two-tier XAI explanation for a quality assessment.

        Args:
            quality_assessment (QualityAssessment): Assessed product record.

        Returns:
            dict: {technical, non_technical, grad_cam_available, grad_cam_url}
        """
        breakdown = quality_assessment.get_grade_breakdown()
        grade = quality_assessment.overall_grade
        product_name = quality_assessment.product.name
        weakest = breakdown["weakest_attribute"]
        weak_score = breakdown[weakest]["score"]
        weak_thresh_a = breakdown[weakest]["threshold_a"]
        discount = quality_assessment.discount_percentage

        # --- Technical explanation ---
        threshold_comparison = {
            attr: {
                "score": breakdown[attr]["score"],
                "vs_grade_a": breakdown[attr]["score"]
                - breakdown[attr]["threshold_a"],
                "vs_grade_b": breakdown[attr]["score"]
                - breakdown[attr]["threshold_b"],
                "status": (
                    "Grade A"
                    if breakdown[attr]["passed_a"]
                    else "Grade B"
                    if breakdown[attr]["passed_b"]
                    else "Below Grade B"
                ),
            }
            for attr in ["colour", "size", "ripeness"]
        }

        technical = {
            "breakdown": breakdown,
            "confidence": quality_assessment.confidence,
            "model_version": quality_assessment.model_version,
            "is_mock": quality_assessment.is_mock,
            "threshold_comparison": threshold_comparison,
        }

        # --- Non-technical explanation ---
        if grade == "A":
            summary = (
                f"Your {product_name} received a Grade A — the highest "
                "possible quality rating. All scores for colour, size, and "
                "ripeness exceeded our premium thresholds. These are some of "
                "the best items currently available on the network."
            )
            action = "No action needed. Your produce is listed at full price."
        elif grade == "B":
            summary = (
                f"Your {product_name} received a Grade B. "
                f"{weakest.capitalize()} scored {weak_score:.1f}%, which is "
                f"just below our top threshold of {weak_thresh_a:.1f}%. "
                "Colour and size look great. A 15% discount has been "
                "applied automatically to help move stock quickly."
            )
            action = (
                f"A {discount:.0f}% discount has been applied automatically. "
                "No further action is needed."
            )
        else:
            failing = [
                attr
                for attr in ["colour", "size", "ripeness"]
                if not breakdown[attr]["passed_b"]
            ]
            summary = (
                f"Your {product_name} received a Grade C. "
                f"The following scores were below our minimum standard: "
                f"{', '.join(a.capitalize() for a in failing)}. "
                f"A {discount:.0f}% discount has been applied to help clear "
                "this stock and reduce waste."
            )
            action = (
                f"A {discount:.0f}% discount has been applied. Consider "
                "reviewing harvesting and storage practices for this product."
            )

        non_technical = {
            "summary": summary,
            "action_required": action,
            "grade_badge": grade,
            "colour_emoji": GRADE_EMOJI.get(grade, "⚪"),
        }

        return {
            "technical": technical,
            "non_technical": non_technical,
            "grad_cam_available": bool(
                quality_assessment.grad_cam_image_url
            ),
            "grad_cam_url": quality_assessment.grad_cam_image_url or None,
        }

    @staticmethod
    def generate_recommendation_explanation(product, customer,
                                            recommendation_data):
        """
        Explain why a product was included in a recommendation set.

        Args:
            product (Product): The recommended product.
            customer: User instance.
            recommendation_data (dict): Scoring metadata from the engine.

        Returns:
            dict: {primary_reason, quality_factor, history_factor,
                   social_factor, full_explanation}
        """
        times = recommendation_data.get("original_freq", 0)
        quality_grade = recommendation_data.get("quality_grade")
        boosted = recommendation_data.get("quality_boosted", False)
        producer_name = (
            product.producer.get_full_name() or product.producer.email
        )

        history_factor = None
        quality_factor = None
        social_factor = None

        if times > 0:
            history_factor = (
                f"You have ordered this product {times} time"
                f"{'s' if times != 1 else ''} before."
            )

        if boosted and quality_grade == "A":
            quality_factor = (
                f"{product.name} currently has a Grade A quality rating "
                "— one of the freshest items available on the network."
            )

        if times == 0:
            social_factor = (
                "Customers with similar purchasing patterns to yours have "
                "also bought this item."
            )

        # Build the primary reason for display.
        if boosted:
            primary_reason = "Top quality produce"
        elif times > 0:
            primary_reason = "From your purchase history"
        else:
            primary_reason = "Popular with similar customers"

        # Compose the full explanation sentence.
        parts = [f"We're recommending {producer_name}'s {product.name}"]
        if times > 0:
            parts.append(
                f"because you've ordered it {times} time"
                f"{'s' if times != 1 else ''} before"
            )
        if boosted:
            parts.append(
                "and it currently has a Grade A quality rating — some of "
                "the freshest produce available right now"
            )
        if social_factor:
            parts.append(
                "and customers with similar tastes have also bought this"
            )

        full_explanation = " ".join(parts) + "."

        return {
            "primary_reason": primary_reason,
            "quality_factor": quality_factor,
            "history_factor": history_factor,
            "social_factor": social_factor,
            "full_explanation": full_explanation,
        }

    @staticmethod
    def generate_grad_cam(image_path, model=None):
        """
        Generate a Grad-CAM heatmap to visualise CNN attention regions.

        In production this uses tf-explain or pytorch-grad-cam to overlay
        a heatmap on the produce image, showing which regions the model
        used when deciding on the quality grade.

        Args:
            image_path (str): Path or URL to the input image.
            model: Optional loaded model instance.

        Returns:
            str: File path to the generated heatmap, or empty string if
                 mock mode is active.

        TODO: Implement real Grad-CAM when CNN model is trained.
        Expected interface:
            from tf_explain.core.grad_cam import GradCAM
            explainer = GradCAM()
            heatmap = explainer.explain(
                (image, None), model, class_index=grade_index
            )
            explainer.save(heatmap, output_dir, 'heatmap.png')
        Blocked by: real model training pipeline.
        Library: pip install tf-explain  (or pip install grad-cam for PyTorch)
        """
        logger.info(
            "Grad-CAM requested for %s — mock mode: returning placeholder.",
            image_path,
        )
        # Return empty string; the assessment records is_mock=True so the
        # frontend XAI panel shows the 'mock mode' notice instead.
        return ""
