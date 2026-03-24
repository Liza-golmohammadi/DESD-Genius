from django.contrib import admin
from django.urls import path, include

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)


from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    path("api/products/", include("products.urls")),
    path("api/cart/", include('cart.urls')),
    path("api/orders/", include('orders.urls')),
    path("api/payments/", include("payments.urls")),

    path('accounts-auth/', include('rest_framework.urls')),
    path('accounts/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('accounts/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('accounts/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('accounts/', include("accounts.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)