import os
import numpy as np
import cv2

from django.conf import settings

import keras
from keras.models import load_model
from keras.layers import Dense as KerasDense
from keras.utils import custom_object_scope
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

from ai_service.models import MLModel


MODEL_CACHE = {}


class CompatibleDense(KerasDense):
    def __init__(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        super().__init__(*args, **kwargs)

    @classmethod
    def from_config(cls, config):
        config.pop("quantization_config", None)
        return cls(**config)


def resolve_model_path(raw_path: str) -> str:
    if not raw_path:
        raise ValueError("Empty model path")

    raw_path = raw_path.strip()

    if os.path.isabs(raw_path):
        return raw_path

    return os.path.abspath(os.path.join(settings.BASE_DIR, raw_path))


def load_active_model():
    model_obj = MLModel.objects.filter(is_active=True).first()

    if not model_obj:
        return None, None

    model_path = resolve_model_path(model_obj.file_path)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")

    if model_path not in MODEL_CACHE:
        with custom_object_scope({"Dense": CompatibleDense}):
            MODEL_CACHE[model_path] = load_model(
                model_path,
                compile=False,
                safe_mode=False,
            )

    return MODEL_CACHE[model_path], model_obj


def preprocess_image(image_path):
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Invalid image")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (224, 224))
    image = np.array(image, dtype=np.float32)
    image = preprocess_input(image)
    image = np.expand_dims(image, axis=0)

    return image


def predict_image(image_path):
    keras_model, model_obj = load_active_model()

    if keras_model is None:
        return {
            "predicted_label": "Unknown",
            "rotten_probability": 0.0,
            "confidence": 0.0,
            "grade": "C",
            "mode": "mock",
            "model_record": None,
            "keras_model": None,
        }

    image = preprocess_image(image_path)
    pred = keras_model.predict(image, verbose=0)[0][0]

    rotten_prob = float(pred)

    if rotten_prob >= 0.5:
        label = "Rotten"
        confidence = rotten_prob
        grade = "C"
        status = "Not suitable for sale"
    else:
        label = "Healthy"
        confidence = 1 - rotten_prob
        grade = "A" if confidence > 0.8 else "B"
        status = "Suitable for sale"

    return {
    "predicted_label": label,
    "rotten_probability": rotten_prob,
    "confidence": confidence,
    "grade": grade,
    "status": status,
    "mode": "live",
    "model_record": model_obj,
    "keras_model": keras_model,
}