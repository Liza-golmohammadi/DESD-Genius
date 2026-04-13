from django.core.management.base import BaseCommand
from products.models import Category


DEFAULT_CATEGORIES = [
    "Vegetables",
    "Fruits",
    "Dairy & Eggs",
    "Meat & Poultry",
    "Bread & Bakery",
    "Herbs & Spices",
    "Honey & Preserves",
    "Drinks & Juices",
    "Grains & Pulses",
    "Fish & Seafood",
    "Other",
]


class Command(BaseCommand):
    help = "Seed the database with default product categories"

    def handle(self, *args, **options):
        created_count = 0
        for name in DEFAULT_CATEGORIES:
            _, created = Category.objects.get_or_create(name=name)
            if created:
                created_count += 1

        if created_count:
            self.stdout.write(self.style.SUCCESS(f"Created {created_count} categories."))
        else:
            self.stdout.write("All categories already exist.")
