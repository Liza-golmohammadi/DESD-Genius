from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .services import OrderService
from .serializers import (
    OrderDetailSerializer,
    OrderListSerializer,
    CheckoutInputSerializer,
    ProducerOrderSerializer,
    StatusUpdateSerializer,
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

        try:
            order = OrderService.create_order_from_cart(
                request.user, delivery_address, producer_delivery_dates
            )

            # DONE: Call PaymentService.initiate_payment(order) here
            payment_result = PaymentService.initiate_payment(order)

            order_serializer = OrderDetailSerializer(order)
            response_data = order_serializer.data
            response_data.update(
                {
                    "payment_status": payment_result["status"],
                    "payment_message": "Payment processed in mock/test mode.",
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
                "item_count": item_count,
                "created_at": order.created_at.isoformat(),
            })
 
        return Response(data)