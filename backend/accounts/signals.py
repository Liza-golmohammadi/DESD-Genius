from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, ProducerProfile

@receiver(post_save, sender=User)
def create_producer_profile(sender, instance, created, **kwargs):
    if created and instance.is_producer:
        ProducerProfile.objects.get_or_create(
            user=instance,
            defaults={
                'store_name': '',
                'store_description': '',
                'store_contact': '',
            }
        )