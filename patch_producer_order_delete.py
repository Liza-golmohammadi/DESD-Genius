from pathlib import Path

# -----------------------------
# Patch backend/orders/views.py
# -----------------------------
p = Path("backend/orders/views.py")
text = p.read_text(encoding="utf-8")

if "class ProducerOrderDeleteView" not in text:
    text += '''

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
'''

p.write_text(text, encoding="utf-8")
print("Patched backend/orders/views.py")


# -----------------------------
# Patch backend/orders/urls.py
# -----------------------------
p = Path("backend/orders/urls.py")
text = p.read_text(encoding="utf-8")

if "ProducerOrderDeleteView" not in text:
    text += "\nfrom orders.views import ProducerOrderDeleteView\n"

if "producer-order-delete" not in text:
    text = text.replace(
        "urlpatterns = [",
        'urlpatterns = [\n    path("producer/<int:producer_order_id>/delete/", ProducerOrderDeleteView.as_view(), name="producer-order-delete"),'
    )

p.write_text(text, encoding="utf-8")
print("Patched backend/orders/urls.py")
