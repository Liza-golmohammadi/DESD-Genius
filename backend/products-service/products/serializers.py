from rest_framework import serializers
from .models import Category, Product
import requests

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    image = serializers.ImageField(read_only=True)
    image_source = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "price", "unit", "image_url",
            "image", "image_source",
            "stock_quantity", "low_stock_threshold", "is_available",
            "is_low_stock", "organic_certified",
            "available_from", "available_to", "category",
            "farm_origin", "food_miles", "producer_id", "producer_name",
        ]

    def get_image_source(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url

    def get_is_low_stock(self, obj):
        return obj.is_low_stock


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    is_in_season = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    image = serializers.ImageField(read_only=True)
    image_source = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "description", "price", "unit", "image_url",
            "image", "image_source",
            "stock_quantity", "low_stock_threshold", "is_available",
            "available_from", "available_to", "is_in_season", "is_low_stock",
            "allergens", "organic_certified", "harvest_date",
            "category", "created_at", "updated_at",
            "farm_origin", "food_miles", "producer_id", "producer_name",
        ]

    """ def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.username """

    def get_is_in_season(self, obj):
        return obj.is_in_season

    def get_is_low_stock(self, obj):
        return obj.is_low_stock

    def get_image_source(self, obj):
        request = self.context.get("request")
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url


class ProductCreateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            "sku", "name", "description", "price", "unit", "image_url", "image",
            "stock_quantity", "low_stock_threshold", "is_available",
            "available_from", "available_to", "allergens", "organic_certified",
            "harvest_date", "category",
            "farm_origin", "food_miles",
        ]

    def validate(self, attrs):
        af = attrs.get("available_from")
        at = attrs.get("available_to")
        if af and at and af > at:
            raise serializers.ValidationError("available_from must be <= available_to.")
        return attrs
    
    
    