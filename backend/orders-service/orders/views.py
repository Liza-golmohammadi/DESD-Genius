import logging
import requests
import uuid
from collections import defaultdict
from decimal import Decimal

logger = logging.getLogger(__name__)

from django.conf import settings
from django.db import transaction
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


def _reserve_product_stock(product_id, quantity):
    """Reserve stock in products service."""
    try:
        url = settings.PRODUCTS_SERVICE_URL.rstrip('/') + f'/{product_id}/reserve/'
        token = getattr(settings, 'INTERNAL_SERVICE_TOKEN', '')
        headers = {
            'X-Internal-Service-Token': token,
            'Content-Type': 'application/json',
        }
        logger.info("Reserving stock: POST %s (token present: %s)", url, bool(token))
        resp = requests.post(url, json={'quantity': quantity}, headers=headers, timeout=5)
        if resp.status_code == 200:
            return True, {}
        logger.warning("Stock reserve failed: status=%s body=%s", resp.status_code, resp.text[:500])
        payload = {}
        try:
            payload = resp.json()
        except Exception:
            payload = {'error': f'Stock reservation failed (HTTP {resp.status_code}).'}
        return False, payload
    except Exception as exc:
        logger.exception("Stock reserve request error for product %s", product_id)
        return False, {'error': f'Unable to contact products service: {exc}'}


def _release_product_stock(product_id, quantity):
    """Release previously reserved stock in products service."""
    try:
        url = settings.PRODUCTS_SERVICE_URL.rstrip('/') + f'/{product_id}/release/'
        headers = {
            'X-Internal-Service-Token': getattr(settings, 'INTERNAL_SERVICE_TOKEN', ''),
            'Content-Type': 'application/json',
        }
        requests.post(url, json={'quantity': quantity}, headers=headers, timeout=5)
    except Exception:
        # Best effort rollback across service boundary.
        pass


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
        cart_item = CartItem.objects.filter(cart=cart, product_id=product_id).first()
        current_qty = cart_item.quantity if cart_item else 0
        requested_qty = current_qty + quantity
        available_stock = int(product.get('stock_quantity', 0) or 0)

        if requested_qty > available_stock:
            return Response(
                {
                    'error': 'Requested quantity exceeds available stock.',
                    'available_stock': available_stock,
                    'requested_quantity': requested_qty,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cart_item:
            cart_item.quantity = requested_qty
            cart_item.product_name = product.get('name', cart_item.product_name)
            cart_item.unit_price = Decimal(str(product.get('price', cart_item.unit_price)))
            cart_item.save()
        else:
            CartItem.objects.create(
                cart=cart,
                product_id=product_id,
                product_name=product.get('name', ''),
                unit_price=Decimal(str(product.get('price', 0))),
                quantity=quantity,
            )

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
            product = _fetch_product(item.product_id)
            if not product:
                return Response(
                    {'error': 'Product not found or unavailable.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            available_stock = int(product.get('stock_quantity', 0) or 0)
            if new_qty > available_stock:
                return Response(
                    {
                        'error': 'Requested quantity exceeds available stock.',
                        'available_stock': available_stock,
                        'requested_quantity': new_qty,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
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
    """
    Creates one Order per producer from the customer's cart.
    Returns a list of created orders.
    """
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

        # ── 1. Resolve products and group by producer ─────────────────────────
        resolved_products = {}
        for ci in cart_items:
            product = _fetch_product(ci.product_id)
            if not product:
                return Response(
                    {'error': f'Product {ci.product_id} not found or unavailable.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            available_stock = int(product.get('stock_quantity', 0) or 0)
            if ci.quantity > available_stock:
                return Response(
                    {
                        'error': f'Insufficient stock for "{product.get("name", ci.product_name)}".',
                        'product_id': ci.product_id,
                        'available_stock': available_stock,
                        'requested_quantity': ci.quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            resolved_products[ci.product_id] = product

        # Group cart items by producer_id
        items_by_producer = defaultdict(list)
        for ci in cart_items:
            product = resolved_products[ci.product_id]
            pid = str(product.get('producer_id', '') or '')
            items_by_producer[pid].append(ci)

        # ── 2. Reserve stock for all items ────────────────────────────────────
        reserved_items = []
        for ci in cart_items:
            ok, payload = _reserve_product_stock(ci.product_id, ci.quantity)
            if not ok:
                for reserved in reserved_items:
                    _release_product_stock(reserved['product_id'], reserved['quantity'])
                return Response(
                    {
                        'error': payload.get('error', f'Unable to reserve stock for product {ci.product_id}.'),
                        'product_id': ci.product_id,
                        **({'available_stock': payload.get('available_stock')} if 'available_stock' in payload else {}),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            reserved_items.append({'product_id': ci.product_id, 'quantity': ci.quantity})

        # ── 3. Create one Order per producer ──────────────────────────────────
        checkout_id = uuid.uuid4()
        created_orders = []

        try:
            with transaction.atomic():
                for producer_id, producer_items in items_by_producer.items():
                    # Get producer name from the first product
                    first_product = resolved_products[producer_items[0].product_id]
                    producer_name = str(first_product.get('producer_name', '') or '')

                    # Calculate subtotal for this producer's items
                    subtotal = Decimal('0')
                    order_item_data = []
                    for ci in producer_items:
                        product = resolved_products[ci.product_id]
                        unit_price = Decimal(str(product.get('price', ci.unit_price)))
                        line_total = Decimal(str(ci.quantity)) * unit_price
                        subtotal += line_total
                        order_item_data.append({
                            'product_id': ci.product_id,
                            'product_name': product.get('name', ci.product_name),
                            'producer_id': producer_id,
                            'quantity': ci.quantity,
                            'unit_price': unit_price,
                        })

                    order = Order.objects.create(
                        checkout_id=checkout_id,
                        customer_id=customer_id,
                        producer_id=producer_id,
                        producer_name=producer_name,
                        subtotal=subtotal,
                        delivery_address=serializer.validated_data.get('delivery_address', ''),
                        delivery_date=serializer.validated_data.get('delivery_date'),
                        notes=serializer.validated_data.get('notes', ''),
                    )

                    for item_data in order_item_data:
                        OrderItem.objects.create(order=order, **item_data)

                    created_orders.append(order.pk)

                # Clear the cart
                cart.items.all().delete()
        except Exception:
            for reserved in reserved_items:
                _release_product_stock(reserved['product_id'], reserved['quantity'])
            return Response(
                {'error': 'Checkout failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        orders = Order.objects.filter(pk__in=created_orders).prefetch_related('items')
        return Response(
            {
                'checkout_id': str(checkout_id),
                'orders': OrderSerializer(orders, many=True).data,
            },
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
    """List orders assigned to this producer."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        producer_id = str(request.user.id)
        orders = Order.objects.filter(
            producer_id=producer_id,
        ).prefetch_related('items')
        return Response(
            ProducerOrderSerializer(orders, many=True).data
        )


class ProducerOrderStatusView(APIView):
    """Producer updates the status of their order."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, order_id):
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        producer_id = str(request.user.id)

        try:
            order = Order.objects.get(id=order_id, producer_id=producer_id)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        return Response(ProducerOrderSerializer(order).data)
