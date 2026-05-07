from rest_framework import serializers
from .models import Review
from django.contrib.auth import get_user_model

User = get_user_model()


class ReviewSerializer(serializers.ModelSerializer):
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_name = serializers.SerializerMethodField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'product',
            'product_name',
            'rating',
            'title',
            'comment',
            'is_verified_purchase',
            'helpful_count',
            'customer',
            'customer_email',
            'customer_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'product',
            'customer',
            'is_verified_purchase',
            'helpful_count',
            'created_at',
            'updated_at',
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.username


class ReviewCreateSerializer(serializers.ModelSerializer):
    producer_order_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = [
            'product',
            'producer_order_id',
            'rating',
            'title',
            'comment',
        ]

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

    def validate(self, data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required")

        customer = request.user
        product = data.get('product')
        producer_order_id = data.get('producer_order_id')

        if not product or not producer_order_id:
            raise serializers.ValidationError("Product and producer_order_id are required")

        # Verify producer_order exists and belongs to the customer
        from orders.models import ProducerOrder
        try:
            producer_order = ProducerOrder.objects.select_related('order').get(
                id=producer_order_id,
                order__customer=customer
            )
        except ProducerOrder.DoesNotExist:
            raise serializers.ValidationError("ProducerOrder not found or does not belong to you")

        # Verify the order status is delivered
        if producer_order.status != 'delivered':
            raise serializers.ValidationError(
                "Can only review products from delivered orders"
            )

        # Verify the product is in the order
        if not producer_order.items.filter(product=product).exists():
            raise serializers.ValidationError(
                "This product is not in the specified order"
            )

        # Check if review already exists
        if Review.objects.filter(product=product, customer=customer).exists():
            raise serializers.ValidationError(
                "You have already reviewed this product"
            )

        data['customer'] = customer
        data['producer_order'] = producer_order
        return data

    def create(self, validated_data):
        validated_data.pop('producer_order_id', None)
        return super().create(validated_data)


class ProductReviewSummarySerializer(serializers.Serializer):
    average_rating = serializers.FloatField()
    total_reviews = serializers.IntegerField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())
    reviews = ReviewSerializer(many=True)
