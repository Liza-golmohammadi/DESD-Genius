# GenAI Usage: We utilised AI coding assistants for preliminary scaffolding and
# syntax reference. However, the core module architecture, mathematical models, 
# integration logic, and final implementation were independently designed and 
# comprehensively engineered by our group.
from django.apps import AppConfig


class AiServiceConfig(AppConfig):
    """
    Django app configuration for the AI service module.

    Registers the hybrid quality-aware recommendation system
    as a Django application, enabling model discovery and
    management command registration.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_service"
    verbose_name = "AI Service — Quality & Recommendations"
