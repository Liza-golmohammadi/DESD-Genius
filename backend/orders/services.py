from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Order, ProducerOrder, ProducerOrderItem
from cart.services import CartService
from products.models import Product
from django.contrib.auth import get_user_model
from payments.models import Settlement

User = get_user_model()


class OrderService:
    COMMISSION_RATE = Decimal("0.05")

    @staticmethod
    def _calculate_commission_and_payout(subtotal):
        subtotal = Decimal(str(subtotal)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        commission = (subtotal * OrderService.COMMISSION_RATE).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        payout = (subtotal - commission).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return commission, payout

    @staticmethod
    @transaction.atomic
    def create_order_from_cart(user, delivery_address, producer_delivery_dates):
        if user.role != "customer":
            raise PermissionError("Only customers can create orders.")

        summary = CartService.get_cart_summary(user)

        if summary["item_count"] == 0:
            raise ValueError("Cart is empty")

        now = timezone.now()
        min_delivery_date = (now + timedelta(hours=48)).date()

        normalized_dates = {
            str(key): value for key, value in producer_delivery_dates.items()
        }

        for p_group in summary["producers"]:
            p_id = p_group["producer_id"]
            p_id_str = str(p_id)

            if p_id_str not in normalized_dates:
                raise ValueError(f"Missing delivery date for producer {p_id}")

            delivery_date = normalized_dates[p_id_str]
            if delivery_date < min_delivery_date:
                raise ValueError(
                    f"Delivery date for producer {p_id} must be at least 48 hours from now"
                )

            subtotal = Decimal(str(p_group["producer_subtotal"])).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            producer = User.objects.get(id=p_id)

            if subtotal < producer.minimum_order_value:
                raise ValueError(
                    f"Order subtotal for {producer.get_full_name() or producer.username} (£{subtotal}) "
                    f"is below their minimum of £{producer.minimum_order_value}"
                )

        for p_group in summary["producers"]:
            for item in p_group["items"]:
                product = Product.objects.select_for_update().get(id=item.product_id)
                if item.quantity > product.stock_quantity:
                    raise ValueError(f"{product.name} only has {product.stock_quantity} in stock")

        total_amount = Decimal(str(summary["grand_total"])).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        order = Order.objects.create(
            customer=user,
            total_amount=total_amount,
            delivery_address=delivery_address,
            status="pending",
        )

        for p_group in summary["producers"]:
            subtotal = Decimal(str(p_group["producer_subtotal"])).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            p_id = p_group["producer_id"]
            p_id_str = str(p_id)
            producer = User.objects.get(id=p_id)

            commission, payout = OrderService._calculate_commission_and_payout(subtotal)

            p_order = ProducerOrder.objects.create(
                order=order,
                producer=producer,
                subtotal=subtotal,
                producer_payout=payout,
                delivery_date=normalized_dates[p_id_str],
                status="pending",
            )

            for item in p_group["items"]:
                product = Product.objects.select_for_update().get(id=item.product_id)
                ProducerOrderItem.objects.create(
                    producer_order=p_order,
                    product=product,
                    quantity=item.quantity,
                    unit_price=product.price,
                )
                product.stock_quantity -= item.quantity
                product.save(update_fields=["stock_quantity"])

            Settlement.objects.create(
                producer=producer,
                order=order,
                producer_order=p_order,
                subtotal=subtotal,
                commission_amount=commission,
                payout_amount=payout,
                status="PENDING",
            )

        CartService.clear_cart(user)
        return order

    @staticmethod
    def get_customer_orders(user):
        return Order.objects.filter(customer=user).order_by("-created_at").prefetch_related(
            "producer_orders__items__product",
            "producer_orders__producer",
            "producer_orders__settlement",
        )

    @staticmethod
    def get_producer_orders(user):
        if user.role != "producer":
            raise PermissionError("Only producers can view their sub-orders.")

        return ProducerOrder.objects.filter(producer=user).order_by("delivery_date").select_related(
            "order__customer"
        ).prefetch_related("items__product", "settlement")

    @staticmethod
    def update_producer_order_status(producer_user, producer_order_id, new_status, note=""):
        try:
            p_order = ProducerOrder.objects.get(id=producer_order_id)
        except ProducerOrder.DoesNotExist:
            raise ValueError(f"ProducerOrder with id {producer_order_id} not found.")

        if p_order.producer != producer_user:
            raise PermissionError("You do not have permission to update this order.")

        if not p_order.is_status_transition_valid(new_status):
            raise ValueError(f"Cannot transition from {p_order.status} to {new_status}")

        p_order.status = new_status

        if note:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            new_note = f"[{timestamp}] {note}"
            if p_order.notes:
                p_order.notes = f"{p_order.notes}\n{new_note}"
            else:
                p_order.notes = new_note

        p_order.save()
        return p_order

    @staticmethod
    def reorder(user, order_number):
        try:
            order = Order.objects.get(order_number=order_number, customer=user)
        except Order.DoesNotExist:
            raise ValueError(f"Order {order_number} not found for this user.")

        result = {
            "added": [],
            "unavailable": []
        }

        for p_order in order.producer_orders.all():
            for item in p_order.items.all():
                product = item.product
                if product.is_available and product.stock_quantity >= item.quantity:
                    CartService.add_item(user, product.id, item.quantity)
                    result["added"].append({
                        "product_id": product.id,
                        "product_name": product.name,
                        "quantity": item.quantity
                    })
                else:
                    reason = (
                        "out_of_stock"
                        if not product.is_available
                        else f"insufficient_stock: only {product.stock_quantity} available"
                    )
                    result["unavailable"].append({
                        "product_id": product.id,
                        "product_name": product.name,
                        "reason": reason
                    })

        return result