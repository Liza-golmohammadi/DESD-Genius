from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from orders.views import AdminReportsView, AdminUsersView, AdminOrdersView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/admin/reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("api/admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("api/admin/orders/", AdminOrdersView.as_view(), name="admin-orders"),

    path("api/products/", include("products.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/recipes/", include("recipes.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/ai/", include("ai_service.urls")),

    path("accounts-auth/", include("rest_framework.urls")),
    path("accounts/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("accounts/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("accounts/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("accounts/", include("accounts.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)