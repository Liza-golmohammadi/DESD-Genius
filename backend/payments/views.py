import os
import stripe
from decimal import Decimal

from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Payment, Settlement
from cart.models import Cart, CartItem
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


class CreatePaymentIntentView(APIView):
    # Only logged-in customers can create a payment intent
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Set the Stripe secret key from environment variables (never hardcode this)
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

        # Get the current user's cart from the database
        try:
            cart = Cart.objects.prefetch_related("items__product").get(
                customer=request.user
            )
        except Cart.DoesNotExist:
            return Response(
                {"error": "No cart found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Calculate the grand total by summing all cart item line totals
        grand_total = sum(item.line_total for item in cart.items.all())

        if grand_total <= 0:
            return Response(
                {"error": "Cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Stripe amounts are in the smallest currency unit — pence for GBP
        # e.g. £12.50 becomes 1250 pence
        amount_in_pence = int(grand_total * 100)

        # Create a PaymentIntent on Stripe's servers
        # This reserves the payment and gives us a client_secret
        # The client_secret is sent to the frontend so Stripe.js can confirm the card
        intent = stripe.PaymentIntent.create(
            amount=amount_in_pence,
            currency="gbp",
            # Metadata lets us trace this payment back to the user in Stripe's dashboard
            metadata={"user_id": request.user.id, "user_email": request.user.email},
        )

        # Return the client_secret to the frontend
        # The frontend uses this with Stripe.js to securely collect card details
        # We also send the publishable key so the frontend can initialise Stripe
        return Response(
            {
                "client_secret": intent.client_secret,
                "publishable_key": os.environ.get("STRIPE_PUBLISHABLE_KEY"),
                "amount": str(grand_total),
            },
            status=status.HTTP_200_OK,
        )


# ============================================================================
# PRODUCER SETTLEMENT VIEWS - TC-012 Weekly Payment Settlements
# ============================================================================

from django.http import FileResponse
from .settlement_service import SettlementService
from .serializers import (
    WeeklySettlementCycleSerializer,
    ProducerSettlementSummarySerializer,
)


class ProducerSettlementListView(APIView):
    """Get producer's settlements with optional year/month filtering"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_producer(request.user):
            return Response(
                {"error": "Only producers can view settlements."},
                status=status.HTTP_403_FORBIDDEN,
            )

        year = request.query_params.get("year")
        month = request.query_params.get("month")

        settlements = SettlementService.get_producer_settlements(
            request.user,
            year=int(year) if year else None,
            month=int(month) if month else None,
        )

        serializer = SettlementSerializer(settlements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProducerSettlementSummaryView(APIView):
    """Get producer's settlement summary (totals, pending, paid)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_producer(request.user):
            return Response(
                {"error": "Only producers can view settlements."},
                status=status.HTTP_403_FORBIDDEN,
            )

        summary = SettlementService.get_producer_settlement_summary(request.user)
        serializer = ProducerSettlementSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProducerSettlementReportDownloadView(APIView):
    """Download settlement report as CSV or PDF"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_producer(request.user):
            return Response(
                {"error": "Only producers can download reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        format_type = request.query_params.get("format", "csv")  # csv or pdf
        year = request.query_params.get("year")
        month = request.query_params.get("month")

        if format_type == "pdf":
            # Generate PDF
            pdf_buffer = SettlementService.generate_settlement_pdf(
                request.user,
                year=int(year) if year else None,
                month=int(month) if month else None,
            )
            return FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=f"settlement_report_{timezone.now().strftime('%Y-%m-%d')}.pdf",
                content_type="application/pdf",
            )
        else:
            # Generate CSV
            csv_content = SettlementService.generate_settlement_csv(
                request.user,
                year=int(year) if year else None,
                month=int(month) if month else None,
            )
            return FileResponse(
                csv_content.encode(),
                as_attachment=True,
                filename=f"settlement_report_{timezone.now().strftime('%Y-%m-%d')}.csv",
                content_type="text/csv",
            )


class WeeklySettlementCycleListView(APIView):
    """Get all settlement cycles (admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can view settlement cycles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .models import WeeklySettlementCycle

        cycles = WeeklySettlementCycle.objects.all()
        serializer = WeeklySettlementCycleSerializer(cycles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SettlementMarkAsPaidView(APIView):
    """Mark settlements as paid after bank transfer (admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can mark settlements as paid."},
                status=status.HTTP_403_FORBIDDEN,
            )

        settlement_ids = request.data.get("settlement_ids", [])
        if not settlement_ids:
            return Response(
                {"error": "settlement_ids required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        count = SettlementService.mark_settlements_as_paid(settlement_ids)
        return Response(
            {
                "status": "success",
                "count": count,
                "message": f"Marked {count} settlements as paid",
            },
            status=status.HTTP_200_OK,
        )

# ============================================================================
# ADMIN COMMISSION REPORTING - TC-025
# ============================================================================

class AdminCommissionReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can access commission reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(_build_admin_commission_report(request), status=status.HTTP_200_OK)


class AdminCommissionReportDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response(
                {"error": "Only admins can export commission reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        import csv
        from django.http import HttpResponse

        report = _build_admin_commission_report(request)
        export_format = request.query_params.get("format", "csv").lower()

        if export_format == "excel":
            response = HttpResponse(content_type="application/vnd.ms-excel")
            response["Content-Disposition"] = 'attachment; filename="network_commission_report.xls"'

            rows = [
                "<html><body>",
                "<h1>Network Commission Report</h1>",
                f"<p>Period: {report['period']['date_from']} to {report['period']['date_to']}</p>",
                "<table border='1'>",
                "<tr><th>Order</th><th>Date</th><th>Status</th><th>Payment</th><th>Order Total</th><th>Commission</th><th>Producer</th><th>Producer Subtotal</th><th>Producer Payout</th></tr>",
            ]

            for order in report["orders"]:
                for producer in order["producer_payments"]:
                    rows.append(
                        f"<tr><td>{order['order_number']}</td><td>{order['created_at']}</td><td>{order['status']}</td><td>{order['payment_status']}</td><td>{order['total_amount']}</td><td>{order['commission_amount']}</td><td>{producer['producer_name']}</td><td>{producer['subtotal']}</td><td>{producer['payout_amount']}</td></tr>"
                    )

            rows.append("</table></body></html>")
            response.write("\\n".join(rows))
            return response

        if export_format == "pdf":
            response = HttpResponse(content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="network_commission_report.pdf"'
            response.write(b"%PDF-1.4\\n% Simple demo PDF export for TC-025\\n")
            response.write(f"Network Commission Report\\nPeriod: {report['period']['date_from']} to {report['period']['date_to']}\\n".encode())
            response.write(f"Total order value: {report['summary']['total_order_value']}\\n".encode())
            response.write(f"Total commission: {report['summary']['total_commission']}\\n".encode())
            response.write(f"Total producer payout: {report['summary']['total_producer_payout']}\\n".encode())
            response.write(b"%%EOF")
            return response

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="network_commission_report.csv"'

        writer = csv.writer(response)
        writer.writerow(["Network Commission Report"])
        writer.writerow(["Date From", report["period"]["date_from"]])
        writer.writerow(["Date To", report["period"]["date_to"]])
        writer.writerow([])
        writer.writerow(["Total Order Value", report["summary"]["total_order_value"]])
        writer.writerow(["Total Commission 5%", report["summary"]["total_commission"]])
        writer.writerow(["Total Producer Payout 95%", report["summary"]["total_producer_payout"]])
        writer.writerow(["Number of Orders Processed", report["summary"]["number_of_orders_processed"]])
        writer.writerow([])
        writer.writerow([
            "Order Number",
            "Created At",
            "Customer Email",
            "Order Status",
            "Payment Status",
            "Order Total",
            "Order Commission 5%",
            "Producer",
            "Producer Subtotal",
            "Producer Commission 5%",
            "Producer Payout 95%",
            "Settlement Status",
        ])

        for order in report["orders"]:
            for producer in order["producer_payments"]:
                writer.writerow([
                    order["order_number"],
                    order["created_at"],
                    order["customer_email"],
                    order["status"],
                    order["payment_status"],
                    order["total_amount"],
                    order["commission_amount"],
                    producer["producer_name"],
                    producer["subtotal"],
                    producer["commission_amount"],
                    producer["payout_amount"],
                    producer["settlement_status"],
                ])

        return response


def _money(value):
    from decimal import Decimal, ROUND_HALF_UP
    return Decimal(value or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _money_str(value):
    return str(_money(value))


def _build_admin_commission_report(request):
    from datetime import timedelta
    from decimal import Decimal
    from django.db.models import Q
    from django.utils.dateparse import parse_date
    from orders.models import Order

    today = timezone.localdate()
    date_to = parse_date(request.query_params.get("date_to") or "") or today
    date_from = parse_date(request.query_params.get("date_from") or "") or (date_to - timedelta(days=14))

    orders = Order.objects.select_related("customer").prefetch_related(
        "producer_orders__producer",
        "producer_orders__items__product",
    ).filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )

    status_filter = request.query_params.get("status", "all")
    if status_filter and status_filter != "all":
        orders = orders.filter(status=status_filter)

    producer_filter = request.query_params.get("producer", "all")
    if producer_filter and producer_filter != "all":
        q = Q(producer_orders__producer__email=producer_filter)
        try:
            q |= Q(producer_orders__producer__id=int(producer_filter))
        except ValueError:
            pass
        orders = orders.filter(q).distinct()

    orders = list(orders.order_by("-created_at"))

    payments = Payment.objects.select_related("order").filter(order__in=orders)
    payment_by_order_id = {payment.order_id: payment for payment in payments}

    settlements = Settlement.objects.select_related(
        "order",
        "producer",
        "producer_order",
    ).filter(order__in=orders)

    settlement_by_producer_order_id = {
        settlement.producer_order_id: settlement
        for settlement in settlements
    }

    total_order_value = sum((_money(order.total_amount) for order in orders), Decimal("0.00"))
    total_commission = sum((_money(order.commission_amount) for order in orders), Decimal("0.00"))

    total_producer_payout = Decimal("0.00")
    producer_totals = {}
    order_rows = []

    for order in orders:
        payment = payment_by_order_id.get(order.id)
        producer_payment_rows = []

        for producer_order in order.producer_orders.select_related("producer").all():
            settlement = settlement_by_producer_order_id.get(producer_order.id)

            subtotal = _money(producer_order.subtotal)
            commission = _money(settlement.commission_amount if settlement else subtotal * Decimal("0.05"))
            payout = _money(settlement.payout_amount if settlement else subtotal * Decimal("0.95"))

            producer = producer_order.producer
            producer_name = producer.get_full_name() or producer.email

            total_producer_payout += payout

            producer_payment_rows.append({
                "producer_order_id": producer_order.id,
                "producer_id": producer.id,
                "producer_email": producer.email,
                "producer_name": producer_name,
                "producer_order_status": producer_order.status,
                "subtotal": _money_str(subtotal),
                "commission_amount": _money_str(commission),
                "payout_amount": _money_str(payout),
                "settlement_status": settlement.status if settlement else "MISSING",
                "items": [
                    {
                        "product_name": item.product.name,
                        "quantity": item.quantity,
                        "unit_price": _money_str(item.unit_price),
                        "line_total": _money_str(item.line_total),
                    }
                    for item in producer_order.items.select_related("product").all()
                ],
            })

            if producer.id not in producer_totals:
                producer_totals[producer.id] = {
                    "producer_id": producer.id,
                    "producer_name": producer_name,
                    "producer_email": producer.email,
                    "total_subtotal": Decimal("0.00"),
                    "total_commission": Decimal("0.00"),
                    "total_payout": Decimal("0.00"),
                    "settlement_count": 0,
                }

            producer_totals[producer.id]["total_subtotal"] += subtotal
            producer_totals[producer.id]["total_commission"] += commission
            producer_totals[producer.id]["total_payout"] += payout
            producer_totals[producer.id]["settlement_count"] += 1

        order_rows.append({
            "order_number": order.order_number,
            "created_at": order.created_at.isoformat(),
            "customer_email": order.customer.email,
            "status": order.status,
            "order_type": order.order_type,
            "organisation_name": order.organisation_name,
            "total_amount": _money_str(order.total_amount),
            "commission_amount": _money_str(order.commission_amount),
            "expected_commission_5_percent": _money_str(_money(order.total_amount) * Decimal("0.05")),
            "payment_status": payment.status if payment else "MISSING",
            "producer_count": order.producer_orders.count(),
            "producer_payments": producer_payment_rows,
        })

    producer_breakdown = []
    for row in producer_totals.values():
        producer_breakdown.append({
            "producer_id": row["producer_id"],
            "producer_name": row["producer_name"],
            "producer_email": row["producer_email"],
            "total_subtotal": _money_str(row["total_subtotal"]),
            "total_commission": _money_str(row["total_commission"]),
            "total_payout": _money_str(row["total_payout"]),
            "settlement_count": row["settlement_count"],
        })

    ytd_start = today.replace(month=1, day=1)
    ytd_orders = Order.objects.filter(created_at__date__gte=ytd_start, created_at__date__lte=today)
    monthly_start = today.replace(day=1)
    monthly_orders = Order.objects.filter(created_at__date__gte=monthly_start, created_at__date__lte=today)

    producer_options = []
    seen = set()
    for settlement in Settlement.objects.select_related("producer").all().order_by("producer__email"):
        producer = settlement.producer
        if producer.id not in seen:
            seen.add(producer.id)
            producer_options.append({
                "producer_id": producer.id,
                "producer_name": producer.get_full_name() or producer.email,
                "producer_email": producer.email,
            })

    return {
        "period": {
            "date_from": str(date_from),
            "date_to": str(date_to),
        },
        "summary": {
            "total_order_value": _money_str(total_order_value),
            "total_commission": _money_str(total_commission),
            "total_producer_payout": _money_str(total_producer_payout),
            "number_of_orders_processed": len(orders),
            "commission_rate": "5.00%",
            "producer_payout_rate": "95.00%",
        },
        "monthly_summary": {
            "month_start": str(monthly_start),
            "month_to_date_order_value": _money_str(sum((_money(o.total_amount) for o in monthly_orders), Decimal("0.00"))),
            "month_to_date_commission": _money_str(sum((_money(o.commission_amount) for o in monthly_orders), Decimal("0.00"))),
            "month_to_date_order_count": monthly_orders.count(),
        },
        "year_to_date_summary": {
            "year_start": str(ytd_start),
            "ytd_order_value": _money_str(sum((_money(o.total_amount) for o in ytd_orders), Decimal("0.00"))),
            "ytd_commission": _money_str(sum((_money(o.commission_amount) for o in ytd_orders), Decimal("0.00"))),
            "ytd_order_count": ytd_orders.count(),
        },
        "calculation_checks": {
            "single_order_100": {
                "order_total": "100.00",
                "commission_5_percent": "5.00",
                "producer_payment_95_percent": "95.00",
            },
            "multi_vendor_150": {
                "order_total": "150.00",
                "total_commission_5_percent": "7.50",
                "producer_1_subtotal": "80.00",
                "producer_1_payment_95_percent": "76.00",
                "producer_2_subtotal": "70.00",
                "producer_2_payment_95_percent": "66.50",
            },
        },
        "producer_options": producer_options,
        "producer_breakdown": sorted(producer_breakdown, key=lambda x: x["producer_name"]),
        "orders": order_rows,
    }
