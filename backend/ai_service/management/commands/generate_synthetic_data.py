from django.core.management.base import BaseCommand
from ai_service.utils.synthetic_data import SyntheticDataGenerator

class Command(BaseCommand):
    help = 'Generates synthetic data for AI module'

    def handle(self, *args, **kwargs):
        self.stdout.write("Generating order history...")
        SyntheticDataGenerator.generate_order_interactions()
        self.stdout.write("Generating quality assessments...")
        SyntheticDataGenerator.generate_quality_assessments()
        self.stdout.write(self.style.SUCCESS("Synthetic data generated successfully."))
