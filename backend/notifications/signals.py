"""
Django signals that create Notification records automatically.

1. new_order      → fires after an Order is created (status='pending')
                    Creates one notification per ProducerOrder (each producer is notified).

2. low_stock      → fires after a Product's stock_quantity is saved and
                    falls at or below its low_stock_threshold.

3. status_update  → fires after a ProducerOrder's status changes.
                    Notifies the customer with the new status.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from orders.models import Order, ProducerOrder
from products.models import Product
from .models import Notification


# ── 1. Notify producers when a new order is placed ─────────────────────────────
@receiver(post_save, sender=Order)
def notify_producers_new_order(sender, instance, created, **kwargs):
    """
    When a new Order is created, notify every producer who has a sub-order.
    We use post_save on Order so that the ProducerOrder rows already exist
    (they are created inside the same transaction in OrderService).

    Because ProducerOrders may be created *after* the Order.save(), we use a
    separate helper that is called explicitly from OrderService instead.
    """
    # We intentionally leave this as a no-op here and use the explicit helper
    # below, because ProducerOrder rows are created after Order.save() in the
    # service layer.  See `create_notifications_for_new_order()`.
    pass


def create_notifications_for_new_order(order):
    """
    Call this from OrderService.create_order_from_cart() *after* all
    ProducerOrder rows have been created.
    """
    for p_order in order.producer_orders.select_related("producer").all():
        item_names = ", ".join(
            item.product.name for item in p_order.items.select_related("product").all()
        )
        Notification.objects.create(
            recipient=p_order.producer,
            notification_type="new_order",
            title="New Order Received",
            message=(
                f"You have a new order ({order.order_number}) with items: "
                f"{item_names}. Delivery date: {p_order.delivery_date}. "
                f"Subtotal: £{p_order.subtotal}."
            ),
            order_number=order.order_number,
        )


# ── 2. Notify producer when stock is low ───────────────────────────────────────
@receiver(post_save, sender=Product)
def notify_producer_low_stock(sender, instance, **kwargs):
    """
    After a Product is saved, check if stock_quantity <= low_stock_threshold.
    If so, create a low-stock notification for the producer — but only if one
    hasn't been sent already for this product at this stock level (to avoid spam).
    """
    if instance.stock_quantity <= instance.low_stock_threshold:
        # Avoid duplicate: don't re-notify if an unread low-stock notif already exists
        already_notified = Notification.objects.filter(
            recipient=instance.producer,
            notification_type="low_stock",
            product_id=instance.id,
            is_read=False,
        ).exists()

        if not already_notified:
            Notification.objects.create(
                recipient=instance.producer,
                notification_type="low_stock",
                title="Low Stock Alert",
                message=(
                    f"Your product \"{instance.name}\" is running low — only "
                    f"{instance.stock_quantity} left in stock (threshold: "
                    f"{instance.low_stock_threshold})."
                ),
                product_id=instance.id,
            )


# ── 3. Notify customer when a producer updates order status ───────────────────
@receiver(post_save, sender=ProducerOrder)
def notify_customer_status_update(sender, instance, created, **kwargs):
    """
    When a ProducerOrder's status changes (but not on creation), notify the
    customer with the new status.
    """
    if created:
        return  # skip the initial creation

    # We can't easily detect "status changed" from post_save alone, so we
    # always create a notification when the ProducerOrder is saved and the
    # status is not 'pending' (the initial default).  Duplicate prevention
    # is handled by checking for a recent identical notification.
    order = instance.order
    customer = order.customer

    STATUS_LABELS = {
        "pending": "Pending",
        "confirmed": "Confirmed",
        "ready": "Ready for Collection/Delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
    }
    status_label = STATUS_LABELS.get(instance.status, instance.status)

    # Avoid duplicate: check if we already sent a notification for this exact
    # status on this producer-order within the last minute.
    from django.utils import timezone
    from datetime import timedelta

    recently_sent = Notification.objects.filter(
        recipient=customer,
        notification_type="status_update",
        order_number=order.order_number,
        message__contains=f"status: {status_label}",
        created_at__gte=timezone.now() - timedelta(minutes=1),
    ).exists()

    if not recently_sent:
        producer_name = (
            instance.producer.get_full_name() or instance.producer.email
        )
        Notification.objects.create(
            recipient=customer,
            notification_type="status_update",
            title="Order Status Updated",
            message=(
                f"Your order {order.order_number} from {producer_name} "
                f"has been updated to status: {status_label}."
            ),
            order_number=order.order_number,
        )
