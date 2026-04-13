import requests
from decimal import Decimal

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Cart, CartItem, Order, OrderItem, VALID_STATUS_TRANSITIONS
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddToCartSerializer,
    UpdateCartItemSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ProducerOrderSerializer,
    OrderStatusUpdateSerializer,
)


def _fetch_product(product_id):
    """Fetch product info from the products microservice."""
    try:
        url = settings.PRODUCTS_SERVICE_URL.rstrip('/') + f'/{product_id}/'
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


# ── Cart Views ────────────────────────────────────────────────────────────────

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.prefetch_related('items').get_or_create(
            customer_id=str(request.user.id)
        )
        return Response(CartSerializer(cart).data)


class CartItemListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.prefetch_related('items').get_or_create(
            customer_id=str(request.user.id)
        )
        return Response(CartItemSerializer(cart.items.all(), many=True).data)

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        # Fetch product info from products service
        product = _fetch_product(product_id)
        if not product:
            return Response(
                {'error': 'Product not found or unavailable.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart, _ = Cart.objects.get_or_create(customer_id=str(request.user.id))

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_id=product_id,
            defaults={
                'product_name': product.get('name', ''),
                'unit_price': Decimal(str(product.get('price', 0))),
                'quantity': quantity,
            },
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.product_name = product.get('name', cart_item.product_name)
            cart_item.unit_price = Decimal(str(product.get('price', cart_item.unit_price)))
            cart_item.save()

        cart.refresh_from_db()
        return Response(
            CartSerializer(Cart.objects.prefetch_related('items').get(pk=cart.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            cart = Cart.objects.get(customer_id=str(request.user.id))
            item = cart.items.get(pk=item_id)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response(status=status.HTTP_404_NOT_FOUND)

        new_qty = serializer.validated_data['quantity']
        if new_qty == 0:
            item.delete()
        else:
            item.quantity = new_qty
            item.save()

        cart = Cart.objects.prefetch_related('items').get(pk=cart.pk)
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id):
        try:
            cart = Cart.objects.get(customer_id=str(request.user.id))
            item = cart.items.get(pk=item_id)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response(status=status.HTTP_404_NOT_FOUND)

        item.delete()
        cart = Cart.objects.prefetch_related('items').get(pk=cart.pk)
        return Response(CartSerializer(cart).data)


class CartClearView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        try:
            cart = Cart.objects.get(customer_id=str(request.user.id))
            cart.items.all().delete()
        except Cart.DoesNotExist:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Checkout / Order Placement ────────────────────────────────────────────────

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer_id = str(request.user.id)

        try:
            cart = Cart.objects.prefetch_related('items').get(customer_id=customer_id)
        except Cart.DoesNotExist:
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        cart_items = list(cart.items.all())
        if not cart_items:
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build order
        subtotal = sum(item.line_total for item in cart_items)
        order = Order.objects.create(
            customer_id=customer_id,
            subtotal=subtotal,
            delivery_address=serializer.validated_data.get('delivery_address', ''),
            delivery_date=serializer.validated_data.get('delivery_date'),
            notes=serializer.validated_data.get('notes', ''),
        )

        # Fetch product details for producer_id
        for ci in cart_items:
            product = _fetch_product(ci.product_id)
            producer_id = product.get('producer_id', '') if product else ''
            product_name = product.get('name', ci.product_name) if product else ci.product_name
            unit_price = Decimal(str(product.get('price', ci.unit_price))) if product else ci.unit_price

            OrderItem.objects.create(
                order=order,
                product_id=ci.product_id,
                product_name=product_name,
                producer_id=producer_id,
                quantity=ci.quantity,
                unit_price=unit_price,
            )

        # Clear the cart
        cart.items.all().delete()

        return Response(
            OrderSerializer(Order.objects.prefetch_related('items').get(pk=order.pk)).data,
            status=status.HTTP_201_CREATED,
        )


# ── Order History (Customer) ─────────────────────────────────────────────────

class OrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(
            customer_id=str(request.user.id)
        ).prefetch_related('items')
        return Response(OrderSerializer(orders, many=True).data)


class OrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_number):
        try:
            order = Order.objects.prefetch_related('items').get(
                order_number=order_number,
                customer_id=str(request.user.id),
            )
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


# ── Producer Views ────────────────────────────────────────────────────────────

class ProducerOrdersView(APIView):
    """List orders containing items from this producer."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        producer_id = str(request.user.id)
        order_ids = OrderItem.objects.filter(
            producer_id=producer_id,
        ).values_list('order_id', flat=True).distinct()

        orders = Order.objects.filter(id__in=order_ids).prefetch_related('items')
        serializer = ProducerOrderSerializer(
            orders, many=True, context={'producer_id': producer_id}
        )
        return Response(serializer.data)


class ProducerOrderStatusView(APIView):
    """Producer updates the status of an order."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, order_id):
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        producer_id = str(request.user.id)

        # Verify this producer has items in this order
        has_items = OrderItem.objects.filter(
            order_id=order_id,
            producer_id=producer_id,
        ).exists()

        if not has_items:
            return Response(
                {'error': 'Order not found or you have no items in it.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        new_status = serializer.validated_data['status']

        # Status transition validation
        allowed = VALID_STATUS_TRANSITIONS.get(order.status, [])
        if new_status not in allowed:
            return Response(
                {'error': f'Cannot transition from {order.status} to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        note = serializer.validated_data.get('note', '')
        if note:
            order.notes = f"{order.notes}\n[{new_status}] {note}".strip()
        order.save()

        return Response(
            ProducerOrderSerializer(order, context={'producer_id': producer_id}).data
        )
