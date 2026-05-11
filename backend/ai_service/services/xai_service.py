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

        Uses TensorFlow GradientTape to compute the gradient of the
        rotten-probability sigmoid output w.r.t. the last Conv2D layer's
        activations. The spatial gradient map is pooled, used to weight
        the feature maps, ReLU-clamped, normalised, and overlaid on the
        original image as a jet colormap blend.

        Preprocessing matches the Role 1 training pipeline exactly:
        RGB → resize 224×224 (BILINEAR) → float32 → preprocess_input
        → batch dimension.

        Args:
            image_path (str): Local file path or HTTP/HTTPS URL.
            model: Optional loaded Keras model. If None, the cached model
                   from QualityClassifierService._MODEL_CACHE is used.

        Returns:
            str: Media-relative URL /media/gradcam/<filename>.jpg, or
                 empty string if the model is unavailable or fails.
        """
        import uuid
        import numpy as np
        import tensorflow as tf
        import cv2
        from PIL import Image as PILImage
        from django.conf import settings

        try:
            # Resolve model from cache if not provided.
            if model is None:
                from ai_service.services.quality_classifier import (
                    _MODEL_CACHE,
                )
                if not _MODEL_CACHE:
                    logger.info(
                        "Grad-CAM skipped — model not in cache yet."
                    )
                    return ""
                model = next(iter(_MODEL_CACHE.values()))

            # Find the last Conv2D layer (MobileNetV2 feature extractor).
            last_conv_name = None
            for layer in reversed(model.layers):
                if isinstance(layer, tf.keras.layers.Conv2D):
                    last_conv_name = layer.name
                    break
            if last_conv_name is None:
                logger.warning("Grad-CAM: no Conv2D layer found.")
                return ""

            # Sub-model: input → [conv activations, prediction].
            grad_model = tf.keras.Model(
                inputs=model.inputs,
                outputs=[
                    model.get_layer(last_conv_name).output,
                    model.output,
                ],
            )

            # Download URL to temp file if image_path is remote.
            tmp_file = None
            actual_path = image_path
            if isinstance(image_path, str) and image_path.startswith(
                ("http://", "https://")
            ):
                import tempfile
                import urllib.request

                with tempfile.NamedTemporaryFile(
                    suffix=".jpg", delete=False
                ) as f:
                    tmp_file = f.name
                urllib.request.urlretrieve(image_path, tmp_file)
                actual_path = tmp_file

            try:
                original = PILImage.open(actual_path).convert("RGB")
            finally:
                if tmp_file and os.path.exists(tmp_file):
                    os.unlink(tmp_file)

            original_w, original_h = original.size

            # Preprocess — matches Role 1 training pipeline exactly.
            from tensorflow.keras.applications.mobilenet_v2 import (
                preprocess_input,
            )
            img_resized = original.resize((224, 224), PILImage.BILINEAR)
            img_array = np.array(img_resized, dtype=np.float32)
            img_batch = np.expand_dims(preprocess_input(img_array), axis=0)

            # Compute gradients of rotten-probability w.r.t. conv layer.
            with tf.GradientTape() as tape:
                inputs = tf.cast(img_batch, tf.float32)
                conv_outputs, predictions = grad_model(inputs)
                # predictions[:, 0] is the single sigmoid rotten_probability.
                loss = predictions[:, 0]

            grads = tape.gradient(loss, conv_outputs)   # (1, H, W, C)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))  # (C,)
            conv_out = conv_outputs[0]                  # (H, W, C)
            heatmap = conv_out @ pooled_grads[..., tf.newaxis]  # (H, W, 1)
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0)            # ReLU
            heatmap = heatmap / (tf.reduce_max(heatmap) + 1e-8)  # [0, 1]
            heatmap_np = np.uint8(heatmap.numpy() * 255)

            # Resize heatmap to original image dimensions.
            heatmap_resized = cv2.resize(
                heatmap_np,
                (original_w, original_h),
                interpolation=cv2.INTER_LINEAR,
            )

            # Apply jet colormap and blend over original (60/40 split).
            colormap_bgr = cv2.applyColorMap(
                heatmap_resized, cv2.COLORMAP_JET
            )
            colormap_rgb = cv2.cvtColor(colormap_bgr, cv2.COLOR_BGR2RGB)
            original_np = np.array(original, dtype=np.float32)
            overlay = (
                0.6 * original_np + 0.4 * colormap_rgb.astype(np.float32)
            )
            overlay = np.clip(overlay, 0, 255).astype(np.uint8)

            # Persist to MEDIA_ROOT/gradcam/.
            gradcam_dir = os.path.join(settings.MEDIA_ROOT, "gradcam")
            os.makedirs(gradcam_dir, exist_ok=True)
            filename = f"gradcam_{uuid.uuid4().hex[:12]}.jpg"
            save_path = os.path.join(gradcam_dir, filename)
            PILImage.fromarray(overlay).save(save_path, quality=85)

            url = f"/media/gradcam/{filename}"
            logger.info("Grad-CAM generated: %s", url)
            return url

        except Exception as exc:
            logger.warning("Grad-CAM generation failed: %s", exc)
            return ""
