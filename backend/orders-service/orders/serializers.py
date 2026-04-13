from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, ORDER_STATUS_CHOICES


class CartItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product_id', 'product_name', 'unit_price', 'quantity', 'line_total']
        read_only_fields = ['id', 'product_name', 'unit_price']

    def get_line_total(self, obj):
        return float(obj.line_total)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'updated_at']

    def get_total(self, obj):
        return float(sum(item.line_total for item in obj.items.all()))


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['product_id', 'product_name', 'producer_id', 'quantity', 'unit_price', 'line_total']

    def get_line_total(self, obj):
        return float(obj.line_total)


class OrderSerializer(serializers.ModelSerializer):
    """Order as seen by the customer."""
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'checkout_id', 'customer_id',
            'producer_id', 'producer_name',
            'status', 'delivery_address', 'delivery_date', 'notes',
            'subtotal', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'checkout_id', 'customer_id',
            'producer_id', 'producer_name',
            'status', 'subtotal', 'created_at', 'updated_at',
        ]


class OrderCreateSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(required=False, default="")
    delivery_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="")


class ProducerOrderSerializer(serializers.ModelSerializer):
    """Order as seen by the producer — each order already contains only their items."""
    items = OrderItemSerializer(many=True, read_only=True)
    producer_payout = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'delivery_date', 'notes',
            'subtotal', 'producer_payout', 'items', 'created_at',
        ]

    def get_producer_payout(self, obj):
        # 95% payout (5% platform commission)
        return float(obj.subtotal * 95 / 100)


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ORDER_STATUS_CHOICES)
    note = serializers.CharField(required=False, default="")
