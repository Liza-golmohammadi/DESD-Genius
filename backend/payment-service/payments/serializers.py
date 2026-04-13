from rest_framework import serializers
from .models import Payment, PAYMENT_METHOD_CHOICES


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_ref', 'order_number', 'customer_id',
            'amount', 'method', 'status', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'payment_ref', 'customer_id',
            'status', 'created_at', 'updated_at',
        ]


class CreatePaymentSerializer(serializers.Serializer):
    order_number = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    method = serializers.ChoiceField(
        choices=PAYMENT_METHOD_CHOICES,
        default='card',
    )
    notes = serializers.CharField(required=False, default="")
