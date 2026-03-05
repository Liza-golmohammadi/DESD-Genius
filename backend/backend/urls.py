from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from rest_framework_simplejwt.views import TokenBlacklistView

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
	path('accounts-auth/', include('rest_framework.urls')),
	path('accounts/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('accounts/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
	path('accounts/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
	path('accounts/', include("accounts.urls"))
]
