from rest_framework import serializers


class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(read_only=True)
    producer_id = serializers.IntegerField(read_only=True, required=False)
    producer_name = serializers.CharField(read_only=True, required=False)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


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