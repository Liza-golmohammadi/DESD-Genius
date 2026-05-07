from rest_framework import serializers
from .models import (
    Order, ProducerOrder, ProducerOrderItem, ORDER_STATUS_CHOICES,
    RecurringOrder, RecurringOrderItem,
    RECURRING_FREQUENCY_CHOICES, RECURRING_STATUS_CHOICES,
)

def get_customer_facing_order_status(order):
    """
    Customer-facing overall order status based on producer sub-orders.
    This prevents a multi-vendor order being shown as fully delivered
    when only one producer has delivered their part.
    """
    producer_statuses = list(order.producer_orders.values_list("status", flat=True))

    if not producer_statuses:
        return order.status

    if all(status == "cancelled" for status in producer_statuses):
        return "cancelled"

    if all(status == "delivered" for status in producer_statuses):
        return "delivered"

    if any(status == "delivered" for status in producer_statuses):
        return "partially_delivered"

    if any(status == "ready" for status in producer_statuses):
        return "ready"

    if any(status == "confirmed" for status in producer_statuses):
        return "confirmed"

    return order.status


def get_customer_facing_order_status_display(order):
    status = get_customer_facing_order_status(order)

    if status == "partially_delivered":
        return "Partially Delivered"

    return status.replace("_", " ").title()


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
    item_count = serializers.SerializerMethodField()
    computed_status = serializers.SerializerMethodField()
    computed_status_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "total_amount",
            "commission_amount",
            "delivery_address",
            "status",
            "status_display",
            "computed_status",
            "computed_status_display",
            "order_type",
            "organisation_name",
            "created_at",
            "producer_orders",
            "producer_count",
            "item_count",
        ]
        read_only_fields = fields

    def get_producer_count(self, obj):
        return obj.get_producer_count()

    def get_item_count(self, obj):
        return sum(po.items.count() for po in obj.producer_orders.all())

    def get_computed_status(self, obj):
        return get_customer_facing_order_status(obj)

    def get_computed_status_display(self, obj):
        return get_customer_facing_order_status_display(obj)


class OrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    producer_count = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    computed_status = serializers.SerializerMethodField()
    computed_status_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "total_amount",
            "status",
            "status_display",
            "computed_status",
            "computed_status_display",
            "order_type",
            "organisation_name",
            "created_at",
            "producer_count",
            "item_count",
        ]
        read_only_fields = fields

    def get_producer_count(self, obj):
        return obj.get_producer_count()

    def get_item_count(self, obj):
        return sum(po.items.count() for po in obj.producer_orders.all())

    def get_computed_status(self, obj):
        return get_customer_facing_order_status(obj)

    def get_computed_status_display(self, obj):
        return get_customer_facing_order_status_display(obj)


class CheckoutInputSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(required=True, min_length=10)
    producer_delivery_dates = serializers.DictField(
        child=serializers.DateField(input_formats=["%Y-%m-%d"]),
        required=True,
    )
    # The frontend sends this after Stripe confirms the card payment
    # Our backend uses it to verify the payment actually succeeded on Stripe's end
    payment_intent_id = serializers.CharField(required=True)

    def validate_producer_delivery_dates(self, value):
        if not value:
            raise serializers.ValidationError("producer_delivery_dates cannot be empty.")
        return value


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ORDER_STATUS_CHOICES, required=True)
    note = serializers.CharField(required=False, allow_blank=True, default="")


# ── Recurring Order Serializers ──────────────────────────────────────────────

class RecurringOrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.ReadOnlyField(source="product.id")
    product_name = serializers.ReadOnlyField(source="product.name")
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = RecurringOrderItem
        fields = ["id", "product_id", "product_name", "quantity", "unit_price", "line_total"]
        read_only_fields = fields

    def get_line_total(self, obj):
        return str(obj.line_total)


class RecurringOrderSerializer(serializers.ModelSerializer):
    items = RecurringOrderItemSerializer(many=True, read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    source_order_number = serializers.SerializerMethodField()

    class Meta:
        model = RecurringOrder
        fields = [
            "id",
            "name",
            "frequency",
            "frequency_display",
            "delivery_address",
            "next_delivery_date",
            "end_date",
            "status",
            "status_display",
            "times_placed",
            "last_placed_at",
            "source_order_number",
            "created_at",
            "items",
        ]
        read_only_fields = fields

    def get_source_order_number(self, obj):
        if obj.source_order:
            return obj.source_order.order_number
        return None


class RecurringOrderCreateSerializer(serializers.Serializer):
    """Create a recurring schedule from an existing order."""
    source_order_number = serializers.CharField(required=True)
    name = serializers.CharField(required=False, allow_blank=True, default="")
    frequency = serializers.ChoiceField(choices=RECURRING_FREQUENCY_CHOICES, required=True)
    next_delivery_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=False, allow_null=True, default=None)
    delivery_address = serializers.CharField(required=False, allow_blank=True, default="")


class RecurringOrderUpdateSerializer(serializers.Serializer):
    """Update a recurring schedule (frequency, status, dates)."""
    name = serializers.CharField(required=False, allow_blank=True)
    frequency = serializers.ChoiceField(choices=RECURRING_FREQUENCY_CHOICES, required=False)
    next_delivery_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=RECURRING_STATUS_CHOICES, required=False)
    delivery_address = serializers.CharField(required=False, allow_blank=True)