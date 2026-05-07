from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Payment, Settlement
from .serializers import (
    PaymentSerializer,
    SettlementSerializer,
    SettlementStatusUpdateSerializer,
    PaymentStatusUpdateSerializer,
    SettlementReportSerializer,
)


def is_admin(user):
    return user.is_authenticated and user.role == "admin"


def is_producer(user):
    return user.is_authenticated and user.role == "producer"


def is_customer(user):
    return user.is_authenticated and user.role == "customer"


class PaymentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if is_admin(request.user):
            payments = Payment.objects.select_related("order", "order__customer").all()

        elif is_customer(request.user):
            payments = Payment.objects.select_related(
                "order",
                "order__customer",
            ).filter(order__customer=request.user)

        else:
            return Response(
                {"error": "You do not have permission to view payments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_ref):
        try:
            payment = Payment.objects.select_related("order", "order__customer").get(
                order__order_number=order_ref
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_admin(request.user) and payment.order.customer != request.user:
            return Response(
                {"error": "You do not have permission to view this payment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PaymentSerializer(payment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, order_ref):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can update payment status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = Payment.objects.select_related("order").get(
                order__order_number=order_ref
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PaymentStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment.status = serializer.validated_data["status"]
        payment.save(update_fields=["status"])

        return Response(
            {
                "message": "Payment status updated successfully.",
                "payment": PaymentSerializer(payment).data,
            },
            status=status.HTTP_200_OK,
        )


class SettlementListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settlements = Settlement.objects.select_related(
            "producer",
            "order",
            "producer_order",
        ).all()

        if is_admin(request.user):
            pass

        elif is_producer(request.user):
            settlements = settlements.filter(producer=request.user)

        else:
            return Response(
                {"error": "You do not have permission to view settlements."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SettlementSerializer(settlements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, settlement_id):
        try:
            settlement = Settlement.objects.select_related(
                "producer",
                "order",
                "producer_order",
            ).get(id=settlement_id)
        except Settlement.DoesNotExist:
            return Response(
                {"error": "Settlement not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if is_admin(request.user):
            pass

        elif is_producer(request.user) and settlement.producer == request.user:
            pass

        else:
            return Response(
                {"error": "You do not have permission to view this settlement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SettlementSerializer(settlement)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, settlement_id):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can update settlement status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            settlement = Settlement.objects.select_related("producer", "order").get(
                id=settlement_id
            )
        except Settlement.DoesNotExist:
            return Response(
                {"error": "Settlement not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SettlementStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data["status"]
        settlement.status = new_status

        if new_status == "PAID":
            settlement.paid_at = timezone.now()
            settlement.save(update_fields=["status", "paid_at"])
        else:
            settlement.paid_at = None
            settlement.save(update_fields=["status", "paid_at"])

        return Response(
            {
                "message": "Settlement status updated successfully.",
                "settlement": SettlementSerializer(settlement).data,
            },
            status=status.HTTP_200_OK,
        )


class SettlementReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settlements = Settlement.objects.select_related("producer").all()

        if is_admin(request.user):
            pass

        elif is_producer(request.user):
            settlements = settlements.filter(producer=request.user)

        else:
            return Response(
                {"error": "You do not have permission to view settlement reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        report = (
            settlements.values(
                "producer__id",
                "producer__first_name",
                "producer__last_name",
                "producer__username",
            )
            .annotate(
                total_subtotal=Sum("subtotal"),
                total_commission=Sum("commission_amount"),
                total_payout=Sum("payout_amount"),
                settlement_count=Count("id"),
            )
            .order_by("producer__username")
        )

        formatted_report = []
        for row in report:
            full_name = f"{row['producer__first_name']} {row['producer__last_name']}".strip()
            producer_name = full_name if full_name else row["producer__username"]

            formatted_report.append(
                {
                    "producer_id": row["producer__id"],
                    "producer_name": producer_name,
                    "total_subtotal": row["total_subtotal"],
                    "total_commission": row["total_commission"],
                    "total_payout": row["total_payout"],
                    "settlement_count": row["settlement_count"],
                }
            )

        serializer = SettlementReportSerializer(formatted_report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)