from rest_framework import serializers
from .models import Payment, Settlement, PAYMENT_STATUS_CHOICES, SETTLEMENT_STATUS_CHOICES


class PaymentSerializer(serializers.ModelSerializer):
    order_ref = serializers.CharField(source="order.order_number", read_only=True)
    customer_id = serializers.IntegerField(source="order.customer.id", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_ref",
            "customer_id",
            "total_amount",
            "commission_amount",
            "status",
            "status_display",
            "created_at",
        ]
        read_only_fields = fields


class SettlementSerializer(serializers.ModelSerializer):
    order_ref = serializers.CharField(source="order.order_number", read_only=True)
    producer_id = serializers.IntegerField(source="producer.id", read_only=True)
    producer_name = serializers.SerializerMethodField()
    producer_order_id = serializers.IntegerField(source="producer_order.id", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Settlement
        fields = [
            "id",
            "order_ref",
            "producer_id",
            "producer_name",
            "producer_order_id",
            "subtotal",
            "commission_amount",
            "payout_amount",
            "status",
            "status_display",
            "created_at",
            "paid_at",
        ]
        read_only_fields = fields

    def get_producer_name(self, obj):
        return obj.producer.get_full_name() or obj.producer.username


class SettlementStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SETTLEMENT_STATUS_CHOICES)


class PaymentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PAYMENT_STATUS_CHOICES)


class SettlementReportSerializer(serializers.Serializer):
    producer_id = serializers.IntegerField()
    producer_name = serializers.CharField()
    total_subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    settlement_count = serializers.IntegerField()