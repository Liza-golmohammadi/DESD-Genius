from rest_framework import serializers
from .models import CartItem

class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source='product.id')
    product_name = serializers.ReadOnlyField(source='product.name')
    producer_id = serializers.ReadOnlyField(source='product.producer.id')
    producer_name = serializers.ReadOnlyField(source='product.producer.get_full_name')
    unit_price = serializers.ReadOnlyField(source='product.price')
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'product_id', 'product_name', 'producer_id', 'producer_name',
            'unit_price', 'quantity', 'line_total'
        ]
        read_only_fields = fields

    def get_line_total(self, obj):
        return obj.line_total

class ProducerGroupSerializer(serializers.Serializer):
    producer_id = serializers.IntegerField(read_only=True)
    producer_name = serializers.CharField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    producer_subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

class CartSummarySerializer(serializers.Serializer):
    cart_id = serializers.IntegerField(read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    grand_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    food_miles_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    producers = ProducerGroupSerializer(many=True, read_only=True)
