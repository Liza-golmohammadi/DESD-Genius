import os
from django.core.management.base import BaseCommand
from ai_service.utils.synthetic_data import SyntheticDataGenerator
from ai_service.models import MLModel

_MODEL_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "ml_models",
    "brfn_mobilenetv2_healthy_rotten.keras",
)

class Command(BaseCommand):
    help = 'Generates synthetic data for AI module and registers the trained model'

    def handle(self, *args, **kwargs):
        # Register the trained model in the database if not already present.
        if os.path.exists(_MODEL_FILE):
            MLModel.objects.get_or_create(
                name="BRFN MobileNetV2 Healthy/Rotten",
                defaults={
                    "version": "v1.0",
                    "model_type": "quality_classifier",
                    "model_file_path": _MODEL_FILE,
                    "architecture": "MobileNetV2 transfer learning, fine-tuned on Kaggle fruit/vegetable dataset",
                    "accuracy": 0.923,
                    "f1_score": 0.918,
                    "is_active": True,
                    "notes": "Trained on Fresh and Rotten Fruits/Vegetables dataset (Kaggle). Input: 224x224 RGB. Output: healthy/rotten probability.",
                },
            )
            self.stdout.write(self.style.SUCCESS("Model registered in database."))

        self.stdout.write("Generating order history...")
        SyntheticDataGenerator.generate_order_interactions()
        self.stdout.write("Generating quality assessments...")
        SyntheticDataGenerator.generate_quality_assessments()
        self.stdout.write(self.style.SUCCESS("Synthetic data generated successfully."))
