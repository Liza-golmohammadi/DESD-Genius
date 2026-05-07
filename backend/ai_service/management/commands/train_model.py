from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Mock command to train model'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Model trained successfully (Mock)"))
