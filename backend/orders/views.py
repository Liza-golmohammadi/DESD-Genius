import os
import stripe
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .services import OrderService, RecurringOrderService
from .serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    CheckoutInputSerializer,
    ProducerOrderSerializer,
    StatusUpdateSerializer,
    RecurringOrderSerializer,
    RecurringOrderCreateSerializer,
    RecurringOrderUpdateSerializer,
)
from .models import Order, ProducerOrder
from payments.services import PaymentService

User = get_user_model()


class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response(
                {"error": "Only admins can access reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        total_users = User.objects.count()
        total_producers = User.objects.filter(role="producer").count()
        total_customers = User.objects.filter(role="customer").count()
        total_admins = User.objects.filter(role="admin").count()

        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status="pending").count()
        confirmed_orders = Order.objects.filter(status="confirmed").count()
        ready_orders = Order.objects.filter(status="ready").count()
        delivered_orders = Order.objects.filter(status="delivered").count()
        cancelled_orders = Order.objects.filter(status="cancelled").count()

        total_revenue = Order.objects.aggregate(
            total=Sum("total_amount")
        )["total"] or Decimal("0.00")

        total_commission = Order.objects.aggregate(
            total=Sum("commission_amount")
        )["total"] or Decimal("0.00")

        producer_payout_total = ProducerOrder.objects.aggregate(
            total=Sum("producer_payout")
        )["total"] or Decimal("0.00")

        recent_orders = (
            Order.objects.order_by("-created_at")[:5]
            .values("order_number", "status", "total_amount", "created_at")
        )

        orders_by_status = list(
            Order.objects.values("status").annotate(count=Count("id")).order_by("status")
        )

        return Response(
            {
                "user_summary": {
                    "total_users": total_users,
                    "total_customers": total_customers,
                    "total_producers": total_producers,
                    "total_admins": total_admins,
                },
                "order_summary": {
                    "total_orders": total_orders,
                    "pending_orders": pending_orders,
                    "confirmed_orders": confirmed_orders,
                    "ready_orders": ready_orders,
                    "delivered_orders": delivered_orders,
                    "cancelled_orders": cancelled_orders,
                },
                "financial_summary": {
                    "total_revenue": str(total_revenue),
                    "total_commission": str(total_commission),
                    "producer_payout_total": str(producer_payout_total),
                },
                "orders_by_status": orders_by_status,
                "recent_orders": list(recent_orders),
            }
        )


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        delivery_address = serializer.validated_data["delivery_address"]
        producer_delivery_dates = serializer.validated_data["producer_delivery_dates"]
        payment_intent_id = serializer.validated_data["payment_intent_id"]

        # ── Step 1: Verify the Stripe payment before touching the database ────
        # We ask Stripe directly whether this PaymentIntent succeeded.
        # This prevents anyone from faking a payment by sending a made-up ID.
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            return Response(
                {"error": f"Could not verify payment with Stripe: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if intent.status != "succeeded":
            return Response(
                {"error": f"Payment not confirmed. Stripe status: {intent.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Step 2: Payment verified — create the order ───────────────────────
        try:
            order = OrderService.create_order_from_cart(
                request.user, delivery_address, producer_delivery_dates
            )

            # Record the payment and settlements in our own database
            payment_result = PaymentService.initiate_payment(order)

            order_serializer = OrderDetailSerializer(order)
            response_data = order_serializer.data
            response_data.update(
                {
                    "payment_status": payment_result["status"],
                    "payment_message": "Payment processed via Stripe.",
                    "payment": payment_result,
                }
            )
            return Response(response_data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)


class CustomerOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "customer":
            return Response(
                {"error": "Only customers can view their order list."},
                status=status.HTTP_403_FORBIDDEN,
            )

        orders = OrderService.get_customer_orders(request.user)
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)


class CustomerOrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.user.role == "customer":
            if order.customer != request.user:
                return Response(status=status.HTTP_404_NOT_FOUND)
            serializer = OrderDetailSerializer(order)
            return Response(serializer.data)

        elif request.user.role == "producer":
            p_orders = order.producer_orders.filter(producer=request.user)
            if not p_orders.exists():
                return Response(status=status.HTTP_404_NOT_FOUND)

            serializer = OrderDetailSerializer(order, context={"producer": request.user})
            data = serializer.data
            data["producer_orders"] = [
                po for po in data["producer_orders"] if po["producer_id"] == request.user.id
            ]
            return Response(data)

        return Response(status=status.HTTP_404_NOT_FOUND)


class ReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_number):
        if request.user.role != "customer":
            return Response(
                {"error": "Only customers can reorder."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            result = OrderService.reorder(request.user, order_number)
            return Response(result, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProducerOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "producer":
            return Response(
                {"error": "Only producers can view their sub-orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        p_orders = OrderService.get_producer_orders(request.user)
        serializer = ProducerOrderSerializer(p_orders, many=True)
        return Response(serializer.data)


class ProducerOrderStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, producer_order_id):
        if request.user.role != "producer":
            return Response(
                {"error": "Only producers can update sub-order status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            p_order = OrderService.update_producer_order_status(
                request.user,
                producer_order_id,
                serializer.validated_data["status"],
                serializer.validated_data["note"],
            )
            return Response(ProducerOrderSerializer(p_order).data)
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
class AdminUsersView(APIView):
    """GET /api/admin/users/  — list every registered user (admin only)."""
    permission_classes = [permissions.IsAuthenticated]
 
    def get(self, request):
        if request.user.role != "admin":
            return Response(
                {"error": "Only admins can access the user list."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        qs = User.objects.all().order_by("-date_joined")
 
        # optional filter  ?role=producer
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
 
        data = list(
            qs.values(
                "id", "email", "first_name", "last_name",
                "role", "is_active", "date_joined",
            )
        )
        return Response(data)
 
 
class AdminOrdersView(APIView):
    """GET /api/admin/orders/  — list every order across all customers (admin only)."""
    permission_classes = [permissions.IsAuthenticated]
 
    def get(self, request):
        if request.user.role != "admin":
            return Response(
                {"error": "Only admins can access the orders list."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        qs = Order.objects.select_related("customer").order_by("-created_at")
 
        # optional filters
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
 
        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
 
        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
 
        data = []
        for order in qs:
            item_count = sum(
                po.items.count() for po in order.producer_orders.all()
            )
            data.append({
                "order_number": order.order_number,
                "customer_name": order.customer.get_full_name() or order.customer.email,
                "customer_email": order.customer.email,
                "total_amount": str(order.total_amount),
                "commission_amount": str(order.commission_amount),
                "status": order.status,
                "status_display": order.get_status_display(),
                "order_type": order.order_type,
                "organisation_name": order.organisation_name,
                "item_count": item_count,
                "created_at": order.created_at.isoformat(),
            })
 
        return Response(data)


# ── Recurring Order Views (Restaurant Feature) ───────────────────────────────

class RecurringOrderListCreateView(APIView):
    """
    GET  — list all recurring orders for the current restaurant customer.
    POST — create a new recurring order from a past order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "customer":
            return Response(
                {"error": "Only customers can view recurring orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        schedules = RecurringOrderService.get_customer_recurring_orders(request.user)
        return Response(RecurringOrderSerializer(schedules, many=True).data)

    def post(self, request):
        serializer = RecurringOrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            recurring = RecurringOrderService.create_from_order(
                user=request.user,
                order_number=serializer.validated_data["source_order_number"],
                name=serializer.validated_data.get("name", ""),
                frequency=serializer.validated_data["frequency"],
                next_delivery_date=serializer.validated_data["next_delivery_date"],
                end_date=serializer.validated_data.get("end_date"),
                delivery_address=serializer.validated_data.get("delivery_address", ""),
            )
            return Response(
                RecurringOrderSerializer(recurring).data,
                status=status.HTTP_201_CREATED,
            )
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RecurringOrderDetailView(APIView):
    """
    GET   — get a single recurring order.
    PATCH — update frequency, status, dates, etc.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, recurring_id):
        from .models import RecurringOrder
        try:
            recurring = RecurringOrder.objects.prefetch_related('items__product').get(
                id=recurring_id,
                customer=request.user,
            )
        except RecurringOrder.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(RecurringOrderSerializer(recurring).data)

    def patch(self, request, recurring_id):
        serializer = RecurringOrderUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            recurring = RecurringOrderService.update_schedule(
                user=request.user,
                recurring_order_id=recurring_id,
                **serializer.validated_data,
            )
            return Response(RecurringOrderSerializer(recurring).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RecurringOrderPlaceNowView(APIView):
    """POST — manually trigger a recurring order (adds items to cart)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, recurring_id):
        try:
            result = RecurringOrderService.place_now(
                user=request.user,
                recurring_order_id=recurring_id,
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ---------------------------------------------------------------------------
# Producer order delete/cancel endpoint
# ---------------------------------------------------------------------------

from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response


class ProducerOrderDeleteView(APIView):
    """
    DELETE /api/orders/producer/<producer_order_id>/delete/

    Demo-safe delete for producer dashboard.
    This does not physically remove financial/order records.
    It marks the producer's sub-order as cancelled.
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, producer_order_id):
        from orders.models import ProducerOrder

        user_role = getattr(request.user, "role", "")

        try:
            qs = ProducerOrder.objects.select_related("order", "producer")

            if user_role == "producer":
                producer_order = qs.get(
                    id=producer_order_id,
                    producer=request.user,
                )
            elif user_role == "admin" or request.user.is_staff:
                producer_order = qs.get(id=producer_order_id)
            else:
                return Response(
                    {"error": "Only producers or admins can delete producer orders."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        except ProducerOrder.DoesNotExist:
            return Response(
                {"error": "Producer order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        old_status = producer_order.status
        producer_order.status = "cancelled"

        update_fields = ["status"]
        producer_fields = {field.name for field in producer_order._meta.fields}
        if "updated_at" in producer_fields:
            update_fields.append("updated_at")

        producer_order.save(update_fields=update_fields)

        parent_order = producer_order.order

        # If every producer sub-order is cancelled, mark parent order cancelled too.
        producer_statuses = list(
            parent_order.producer_orders.values_list("status", flat=True)
        )

        if producer_statuses and all(s == "cancelled" for s in producer_statuses):
            parent_order.status = "cancelled"

            parent_fields = {field.name for field in parent_order._meta.fields}
            parent_update_fields = ["status"]
            if "updated_at" in parent_fields:
                parent_update_fields.append("updated_at")

            parent_order.save(update_fields=parent_update_fields)

        return Response(
            {
                "deleted": True,
                "message": "Producer order removed from active dashboard by marking it as cancelled.",
                "producer_order_id": producer_order.id,
                "old_status": old_status,
                "new_status": producer_order.status,
                "parent_order_number": parent_order.order_number,
                "parent_order_status": parent_order.status,
            },
            status=status.HTTP_200_OK,
        )
