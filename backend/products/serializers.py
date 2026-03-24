from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]

class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    producer_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id","sku","name","price","unit","image_url",
            "stock_quantity","is_available","organic_certified",
            "available_from","available_to","category","producer_name",
            "farm_origin","food_miles",
        ]

    def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.username

class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    producer_name = serializers.SerializerMethodField()
    is_in_season = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id","sku","name","description","price","unit","image_url",
            "stock_quantity","low_stock_threshold","is_available",
            "available_from","available_to","is_in_season","is_low_stock",
            "allergens","organic_certified","harvest_date",
            "category","producer_name","created_at","updated_at",
            "farm_origin","food_miles",
        ]

    def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.username

    def get_is_in_season(self, obj):
        return obj.is_in_season

    def get_is_low_stock(self, obj):
        return obj.is_low_stock

class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "sku","name","description","price","unit","image_url",
            "stock_quantity","low_stock_threshold","is_available",
            "available_from","available_to","allergens","organic_certified",
            "harvest_date","category",
            "farm_origin","food_miles",
        ]

    def validate(self, attrs):
        af = attrs.get("available_from")
        at = attrs.get("available_to")
        if af and at and af > at:
            raise serializers.ValidationError("available_from must be <= available_to.")
        return attrs