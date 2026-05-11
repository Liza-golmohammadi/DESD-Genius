from django.core.management.base import BaseCommand
import os

class Command(BaseCommand):
    help = "Information about model training procedure"

    def handle(self, *args, **kwargs):
        msg = (
            "Model training was performed in a Jupyter notebook located at "
            "notebooks/train_mobilenetv2.ipynb (see repository root).\n\n"
            "The trained Keras model is bundled at:\n"
            "  backend/ai_service/ml_models/brfn_mobilenetv2_healthy_rotten.keras\n\n"
            "To register the trained model in the database and generate "
            "synthetic supporting data, run:\n"
            "  python manage.py generate_synthetic_data\n\n"
            "Final held-out test accuracy: 93.85%\n"
            "Architecture: MobileNetV2 transfer learning (binary healthy/rotten)"
        )
        self.stdout.write(msg)