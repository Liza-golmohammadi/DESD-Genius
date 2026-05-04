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


class PaymentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.select_related("order", "order__customer").all()
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

        serializer = PaymentSerializer(payment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PaymentStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, order_ref):
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

        if request.user.role == "producer":
            settlements = settlements.filter(producer=request.user)

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

        if request.user.role == "producer" and settlement.producer != request.user:
            return Response(
                {"error": "You do not have permission to view this settlement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SettlementSerializer(settlement)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, settlement_id):
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
            settlement.save(update_fields=["status"])

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

        if request.user.role == "producer":
            settlements = settlements.filter(producer=request.user)

        report = (
            settlements.values("producer__id", "producer__first_name", "producer__last_name", "producer__username")
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

            formatted_report.append({
                "producer_id": row["producer__id"],
                "producer_name": producer_name,
                "total_subtotal": row["total_subtotal"],
                "total_commission": row["total_commission"],
                "total_payout": row["total_payout"],
                "settlement_count": row["settlement_count"],
            })

        serializer = SettlementReportSerializer(formatted_report, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)