from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    GET  /api/notifications/        → list current user's notifications (newest first)
    Query params:
      - unread_only=true            → filter to unread only
      - limit=N                     → cap results (default 50)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)

        if request.query_params.get("unread_only", "").lower() == "true":
            qs = qs.filter(is_read=False)

        limit = int(request.query_params.get("limit", 50))
        qs = qs[:limit]

        serializer = NotificationSerializer(qs, many=True)
        return Response(serializer.data)


class NotificationUnreadCountView(APIView):
    """
    GET  /api/notifications/unread-count/  → {"unread_count": N}
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/<id>/read/   → mark a single notification as read
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notif = Notification.objects.get(
                id=notification_id, recipient=request.user
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notif).data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/  → mark every unread notification as read
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})
