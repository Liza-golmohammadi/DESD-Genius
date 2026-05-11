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
            "action": action,
            "grade_badge": grade,
            "colour_emoji": GRADE_EMOJI.get(grade, "⚪"),
        }

        # Generate feature attributions for technical XAI.
        feature_attributions = XAIService._compute_feature_attributions(
            quality_assessment
        )

        # Generate heatmap as base64 for inline display.
        heatmap_b64 = XAIService._generate_heatmap_b64(quality_assessment)

        return {
            "technical": technical,
            "non_technical": non_technical,
            "grad_cam_available": bool(heatmap_b64),
            "grad_cam_url": quality_assessment.grad_cam_image_url or None,
            "heatmap_b64": heatmap_b64,
            "feature_attributions": feature_attributions,
        }

    @staticmethod
    def _compute_feature_attributions(quality_assessment):
        """
        Compute feature attribution scores showing how much each
        attribute contributed to the final grade decision.

        Uses a threshold-distance approach: how far each score is
        from the grade boundary determines its influence on the grade.

        Returns:
            list[dict]: Ordered attributions with direction and magnitude.
        """
        from ai_service.models import GRADE_A_THRESHOLDS, GRADE_B_THRESHOLDS

        breakdown = quality_assessment.get_grade_breakdown()
        grade = quality_assessment.overall_grade

        # Choose the relevant threshold set for attribution.
        thresholds = (
            GRADE_A_THRESHOLDS if grade == "A" else GRADE_B_THRESHOLDS
        )

        attributions = []
        total_influence = 0.0

        for attr in ["colour", "size", "ripeness"]:
            score = breakdown[attr]["score"]
            threshold = thresholds[attr]
            distance = score - threshold
            abs_distance = abs(distance)
            total_influence += abs_distance

            attributions.append({
                "attribute": attr,
                "score": score,
                "threshold": threshold,
                "distance": round(distance, 1),
                "direction": "positive" if distance >= 0 else "negative",
            })

        # Normalise to percentages.
        for attr in attributions:
            attr["influence_pct"] = round(
                abs(attr["distance"]) / max(total_influence, 0.1) * 100, 1
            )

        # Sort by influence (highest first).
        attributions.sort(key=lambda a: a["influence_pct"], reverse=True)
        return attributions

    @staticmethod
    def _generate_heatmap_b64(quality_assessment):
        """
        Generate a synthetic Grad-CAM-style heatmap as a base64 PNG.

        In demo/mock mode, this creates a simulated attention heatmap
        using matplotlib that visualises which quality dimensions the
        model focused on. The heatmap intensity is driven by the actual
        assessment scores.

        In production with a real CNN, this would be replaced by
        tf-explain or pytorch-grad-cam generating true gradient-weighted
        class activation maps from the model's last convolutional layer.

        Returns:
            str: Base64-encoded PNG string, or empty string on failure.
        """
        try:
            import base64
            import io
            import numpy as np
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            from matplotlib.colors import LinearSegmentedColormap

            colour_s = quality_assessment.colour_score / 100.0
            size_s = quality_assessment.size_score / 100.0
            ripeness_s = quality_assessment.ripeness_score / 100.0
            grade = quality_assessment.overall_grade

            # Create a 3-panel heatmap showing attention per attribute.
            fig, axes = plt.subplots(1, 4, figsize=(12, 3.2))
            fig.patch.set_facecolor("#1a1a2e")

            # Custom colormaps per attribute.
            cmaps = {
                "Colour": LinearSegmentedColormap.from_list(
                    "c", ["#0d1b2a", "#1b4332", "#52b788", "#b7e4c7"]
                ),
                "Size": LinearSegmentedColormap.from_list(
                    "s", ["#0d1b2a", "#1e3a5f", "#3b82f6", "#93c5fd"]
                ),
                "Ripeness": LinearSegmentedColormap.from_list(
                    "r", ["#0d1b2a", "#78350f", "#f59e0b", "#fde68a"]
                ),
            }

            scores = {
                "Colour": colour_s,
                "Size": size_s,
                "Ripeness": ripeness_s,
            }

            np.random.seed(quality_assessment.id or 42)

            for idx, (attr, score) in enumerate(scores.items()):
                ax = axes[idx]

                # Generate synthetic attention pattern.
                size_grid = 14  # Simulates 14x14 feature map.
                base = np.random.rand(size_grid, size_grid) * 0.3
                # Create 2-3 hotspots driven by the score.
                n_spots = 2 + int(score * 2)
                for _ in range(n_spots):
                    cx = np.random.randint(2, size_grid - 2)
                    cy = np.random.randint(2, size_grid - 2)
                    y, x = np.mgrid[0:size_grid, 0:size_grid]
                    spread = 1.5 + np.random.rand() * 2
                    gaussian = np.exp(
                        -((x - cx) ** 2 + (y - cy) ** 2) / (2 * spread ** 2)
                    )
                    base += gaussian * score

                base = base / base.max() if base.max() > 0 else base

                ax.imshow(
                    base,
                    cmap=cmaps[attr],
                    interpolation="bilinear",
                    aspect="equal",
                )
                ax.set_title(
                    f"{attr}\n{score * 100:.0f}%",
                    fontsize=10,
                    fontweight="bold",
                    color="#e2e8f0",
                    pad=8,
                )
                ax.axis("off")

            # Combined overlay panel.
            ax_combined = axes[3]
            combined = np.zeros((14, 14))
            for i, (_, score) in enumerate(scores.items()):
                layer = np.random.rand(14, 14) * 0.2
                n_spots = 2 + int(score * 2)
                for _ in range(n_spots):
                    cx = np.random.randint(2, 12)
                    cy = np.random.randint(2, 12)
                    y, x = np.mgrid[0:14, 0:14]
                    spread = 1.5 + np.random.rand() * 2
                    gaussian = np.exp(
                        -((x - cx) ** 2 + (y - cy) ** 2) / (2 * spread ** 2)
                    )
                    layer += gaussian * score
                combined += layer

            combined = combined / combined.max() if combined.max() > 0 else combined

            grade_cmap = {
                "A": LinearSegmentedColormap.from_list(
                    "a", ["#0d1b2a", "#065f46", "#10b981", "#6ee7b7"]
                ),
                "B": LinearSegmentedColormap.from_list(
                    "b", ["#0d1b2a", "#78350f", "#f59e0b", "#fde68a"]
                ),
                "C": LinearSegmentedColormap.from_list(
                    "c", ["#0d1b2a", "#7f1d1d", "#ef4444", "#fca5a5"]
                ),
            }

            ax_combined.imshow(
                combined,
                cmap=grade_cmap.get(grade, grade_cmap["B"]),
                interpolation="bilinear",
                aspect="equal",
            )
            ax_combined.set_title(
                f"Combined\nGrade {grade}",
                fontsize=10,
                fontweight="bold",
                color="#e2e8f0",
                pad=8,
            )
            ax_combined.axis("off")

            plt.tight_layout(pad=1.5)

            buf = io.BytesIO()
            fig.savefig(
                buf, format="png", dpi=120, bbox_inches="tight",
                facecolor=fig.get_facecolor(), edgecolor="none",
            )
            plt.close(fig)
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("utf-8")

        except Exception as exc:
            logger.warning("Could not generate heatmap: %s", exc)
            return ""

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
