import os
import uuid
import cv2
import numpy as np

from django.conf import settings


def generate_simple_heatmap(image_path):
    """
    Fallback XAI: creates a simple saliency-style heatmap.
    This guarantees output even if Grad-CAM fails.
    """

    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Invalid image")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # edges = "attention"
    edges = cv2.Canny(gray, 100, 200)

    heatmap = cv2.applyColorMap(edges, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(image, 0.6, heatmap, 0.4, 0)

    xai_dir = os.path.join(settings.MEDIA_ROOT, "xai")
    os.makedirs(xai_dir, exist_ok=True)

    filename = f"xai_{uuid.uuid4().hex}.jpg"
    path = os.path.join(xai_dir, filename)

    cv2.imwrite(path, overlay)

    return {
        "relative_path": f"xai/{filename}",
        "method": "edge-based (fallback)"
    }