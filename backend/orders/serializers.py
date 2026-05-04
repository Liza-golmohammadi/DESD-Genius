from rest_framework import serializers
from .models import Order, ProducerOrder, ProducerOrderItem, ORDER_STATUS_CHOICES


class ProducerOrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source="product.id")
    product_name = serializers.ReadOnlyField(source="product.name")
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = ProducerOrderItem
        fields = ["product_id", "product_name", "quantity", "unit_price", "line_total"]
        read_only_fields = fields

    def get_line_total(self, obj):
        return obj.line_total


class ProducerOrderSerializer(serializers.ModelSerializer):
    producer_id = serializers.ReadOnlyField(source="producer.id")
    producer_name = serializers.SerializerMethodField()

    order_number = serializers.ReadOnlyField(source="order.order_number")
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.ReadOnlyField(source="order.customer.email")
    customer_phone = serializers.SerializerMethodField()
    delivery_address = serializers.ReadOnlyField(source="order.delivery_address")
    order_created_at = serializers.ReadOnlyField(source="order.created_at")

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = ProducerOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProducerOrder
        fields = [
            "id",
            "order_number",
            "producer_id",
            "producer_name",
            "customer_name",
            "customer_email",
            "customer_phone",
            "delivery_address",
            "order_created_at",
            "subtotal",
            "producer_payout",
            "delivery_date",
            "status",
            "status_display",
            "notes",
            "items",
        ]
        read_only_fields = fields

    def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.email

    def get_customer_name(self, obj):
        return obj.order.customer.get_full_name() or obj.order.customer.email

    def get_customer_phone(self, obj):
        return (
            getattr(obj.order.customer, "phone", "")
            or getattr(obj.order.customer, "phone_number", "")
        )


class OrderDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    producer_orders = ProducerOrderSerializer(many=True, read_only=True)
    producer_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "total_amount",
            "commission_amount",
            "delivery_address",
            "status",
            "status_display",
            "created_at",
            "producer_orders",
            "producer_count",
        ]
        read_only_fields = fields

    def get_producer_count(self, obj):
        return obj.get_producer_count()


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    producer_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "total_amount",
            "status",
            "status_display",
            "created_at",
            "producer_count",
        ]
        read_only_fields = fields

    def get_producer_count(self, obj):
        return obj.get_producer_count()


class CheckoutInputSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(required=True, min_length=10)
    producer_delivery_dates = serializers.DictField(
        child=serializers.DateField(input_formats=["%Y-%m-%d"]),
        required=True,
    )

    def validate_producer_delivery_dates(self, value):
        if not value:
            raise serializers.ValidationError("producer_delivery_dates cannot be empty.")
        return value


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ORDER_STATUS_CHOICES, required=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")