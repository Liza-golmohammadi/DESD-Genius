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
from .models import Order
from payments.services import PaymentService


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

            try:
                payment_data = PaymentService.initiate_payment(order)
                payment_status = payment_data["status"]
                payment_message = "Payment record created successfully."
            except Exception as payment_error:
                payment_data = None
                payment_status = "ERROR"
                payment_message = f"Payment record could not be created: {str(payment_error)}"

            order_serializer = OrderDetailSerializer(order)
            response_data = order_serializer.data
            response_data.update(
                {
                    "payment_status": payment_status,
                    "payment_message": payment_message,
                    "payment_details": payment_data,
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