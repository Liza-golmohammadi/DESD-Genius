from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Order, ProducerOrder, ProducerOrderItem
from cart.services import CartService
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()


class OrderService:

    @staticmethod
    def _get_delivery_date(producer_delivery_dates, producer_id):
        """
        Accept both integer and string producer IDs as dictionary keys.

        Frontend JSON normally sends keys as strings:
            {"5": "2026-05-10"}

        Python tests may use integer keys:
            {5: date(2026, 5, 10)}
        """
        if producer_id in producer_delivery_dates:
            return producer_delivery_dates[producer_id]

        producer_id_str = str(producer_id)
        if producer_id_str in producer_delivery_dates:
            return producer_delivery_dates[producer_id_str]

        return None

    @staticmethod
    def _sync_parent_order_status(order):
        """
        Keep the main customer-facing Order status aligned with its producer sub-orders.

        For a single-producer order, this means the customer sees the same status
        that the producer has set.

        For a multi-producer order, the parent status reflects the overall progress.
        """
        statuses = list(order.producer_orders.values_list("status", flat=True))

        if not statuses:
            return

        if all(status == "cancelled" for status in statuses):
            new_status = "cancelled"

        elif all(status == "delivered" for status in statuses):
            new_status = "delivered"

        elif all(status in ["delivered", "cancelled"] for status in statuses):
            # Mixed completed/cancelled sub-orders: the order is no longer active.
            new_status = "delivered"

        elif any(status == "ready" for status in statuses):
            new_status = "ready"

        elif any(status == "confirmed" for status in statuses):
            new_status = "confirmed"

        else:
            new_status = "pending"

        if order.status != new_status:
            order.status = new_status
            order.save(update_fields=["status", "updated_at"])

    @staticmethod
    @transaction.atomic
    def create_order_from_cart(user, delivery_address, producer_delivery_dates):
        if user.role != "customer":
            raise PermissionError("Only customers can create orders.")

        summary = CartService.get_cart_summary(user)

        if summary["item_count"] == 0:
            raise ValueError("Cart is empty")

        now = timezone.now()
        min_delivery_time = now + timedelta(hours=48)
        min_delivery_date = min_delivery_time.date()

        # Validate delivery dates and producer minimum order values.
        for p_group in summary["producers"]:
            p_id = p_group["producer_id"]
            delivery_date = OrderService._get_delivery_date(producer_delivery_dates, p_id)

            if delivery_date is None:
                raise ValueError(f"Missing delivery date for producer {p_id}")

            if delivery_date < min_delivery_date:
                raise ValueError(
                    f"Delivery date for producer {p_id} must be at least 48 hours from now"
                )

            subtotal = p_group["producer_subtotal"]
            producer = User.objects.get(id=p_id)

            if subtotal < producer.minimum_order_value:
                raise ValueError(
                    f"Order subtotal for {producer.get_full_name() or producer.username} (£{subtotal}) "
                    f"is below their minimum of £{producer.minimum_order_value}"
                )

        # Re-validate stock before creating the order.
        for p_group in summary["producers"]:
            for item in p_group["items"]:
                product = Product.objects.select_for_update().get(id=item["product_id"])

                if item["quantity"] > product.stock_quantity:
                    raise ValueError(f"{product.name} only has {product.stock_quantity} in stock")

                if not product.is_orderable():
                    raise ValueError(f"{product.name} is not currently orderable.")

        total_amount = summary["grand_total"]

        order = Order.objects.create(
            customer=user,
            total_amount=total_amount,
            delivery_address=delivery_address,
            status="pending",
        )

        # Create one producer sub-order per producer group.
        for p_group in summary["producers"]:
            subtotal = p_group["producer_subtotal"]
            p_id = p_group["producer_id"]
            producer = User.objects.get(id=p_id)
            delivery_date = OrderService._get_delivery_date(producer_delivery_dates, p_id)

            p_order = ProducerOrder.objects.create(
                order=order,
                producer=producer,
                subtotal=subtotal,
                delivery_date=delivery_date,
                status="pending",
            )

            for item in p_group["items"]:
                product = Product.objects.select_for_update().get(id=item["product_id"])

                ProducerOrderItem.objects.create(
                    producer_order=p_order,
                    product=product,
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                )

                product.stock_quantity -= item["quantity"]
                product.save(update_fields=["stock_quantity"])

        CartService.clear_cart(user)

        return order

    @staticmethod
    def get_customer_orders(user):
        return Order.objects.filter(customer=user).order_by("-created_at").prefetch_related(
            "producer_orders__items__product",
            "producer_orders__producer",
        )

    @staticmethod
    def get_producer_orders(user):
        if user.role != "producer":
            raise PermissionError("Only producers can view their sub-orders.")

        return ProducerOrder.objects.filter(producer=user).order_by("delivery_date").select_related(
            "order__customer",
        ).prefetch_related("items__product")

    @staticmethod
    def update_producer_order_status(producer_user, producer_order_id, new_status, note=""):
        try:
            p_order = ProducerOrder.objects.select_related("order", "producer").get(id=producer_order_id)
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

        OrderService._sync_parent_order_status(p_order.order)

        return p_order

    @staticmethod
    def reorder(user, order_number):
        try:
            order = Order.objects.get(order_number=order_number, customer=user)
        except Order.DoesNotExist:
            raise ValueError(f"Order {order_number} not found for this user.")

        result = {
            "added": [],
            "unavailable": [],
        }

        for p_order in order.producer_orders.all():
            for item in p_order.items.all():
                product = item.product

                if product.is_orderable() and product.stock_quantity >= item.quantity:
                    CartService.add_item(user, product.id, item.quantity)
                    result["added"].append(
                        {
                            "product_id": product.id,
                            "product_name": product.name,
                            "quantity": item.quantity,
                        }
                    )
                else:
                    if product.stock_quantity <= 0 or not product.is_available:
                        reason = "out_of_stock"
                    elif not product.is_orderable():
                        reason = "not_orderable"
                    else:
                        reason = f"insufficient_stock: only {product.stock_quantity} available"

                    result["unavailable"].append(
                        {
                            "product_id": product.id,
                            "product_name": product.name,
                            "reason": reason,
                        }
                    )

        return result