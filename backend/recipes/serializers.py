from rest_framework import serializers
from .models import Recipe


class RecipeSerializer(serializers.ModelSerializer):
    producer_name = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "title",
            "description",
            "ingredients",
            "producer",
            "producer_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "producer", "producer_name", "created_at", "updated_at"]

    def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.email
