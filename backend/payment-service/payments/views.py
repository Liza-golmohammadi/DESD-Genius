import requests

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Payment
from .serializers import PaymentSerializer, CreatePaymentSerializer


def _fetch_order(order_number, auth_header=None):
    """Fetch order info from the orders microservice."""
    try:
        url = settings.ORDERS_SERVICE_URL.rstrip('/') + f'/{order_number}/'
        headers = {}
        if auth_header:
            headers['Authorization'] = auth_header
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


class PaymentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List payments for the authenticated customer."""
        payments = Payment.objects.filter(customer_id=str(request.user.id))
        return Response(PaymentSerializer(payments, many=True).data)

    def post(self, request):
        """Record a new payment (simulated — auto-completes)."""
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_number = serializer.validated_data['order_number']
        customer_id = str(request.user.id)

        # Check if a payment already exists for this order
        if Payment.objects.filter(order_number=order_number, customer_id=customer_id).exists():
            return Response(
                {'error': 'Payment already exists for this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.create(
            order_number=order_number,
            customer_id=customer_id,
            amount=serializer.validated_data['amount'],
            method=serializer.validated_data.get('method', 'card'),
            notes=serializer.validated_data.get('notes', ''),
            status='completed',  # Simulated — auto-completes
        )

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_ref):
        try:
            payment = Payment.objects.get(
                payment_ref=payment_ref,
                customer_id=str(request.user.id),
            )
        except Payment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(PaymentSerializer(payment).data)


class PaymentByOrderView(APIView):
    """Look up payment by order_number (for frontend convenience)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_number):
        try:
            payment = Payment.objects.get(
                order_number=order_number,
                customer_id=str(request.user.id),
            )
        except Payment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(PaymentSerializer(payment).data)
