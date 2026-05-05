from .models import ProducerProfile
from .serializers import UserUpdateSerializer, CustomerRegisterSerializer, ProducerRegisterSerializer, ProducerListSerializer, ProducerProfileSerializer, CustomTokenObtainPairSerializer
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import NotFound
from django.contrib.auth import get_user_model, authenticate
from rest_framework import viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings


# ── Cookie helpers ────────────────────────────────────────────────────────────

REFRESH_COOKIE_NAME = 'refresh_token'
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


def _set_refresh_cookie(response, refresh_token):
    """Set the refresh token as an HTTP-only cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        samesite='Lax',
        secure=not getattr(settings, 'DEBUG', True),  # Secure=True in production
        path='/api/auth_service/',  # Only sent to auth endpoints
    )


def _clear_refresh_cookie(response):
    """Delete the refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path='/api/auth_service/',
        samesite='Lax',
    )


# ── Permissions ───────────────────────────────────────────────────────────────

class IsProducer(permissions.BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'producer'


# ── Registration ──────────────────────────────────────────────────────────────

class CustomerRegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegisterSerializer
    permission_classes = [permissions.AllowAny]

class ProducerRegisterView(generics.CreateAPIView):
    serializer_class = ProducerRegisterSerializer
    permission_classes = [permissions.AllowAny]


# ── Me (profile) ──────────────────────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserUpdateSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Login — returns access in body, sets refresh as HTTP-only cookie ──────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh = response.data.pop('refresh', None)
            if refresh:
                _set_refresh_cookie(response, refresh)
        return response


# ── Refresh — reads refresh from cookie ───────────────────────────────────────

class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response(
                {'error': 'No refresh token in cookie.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
        except TokenError:
            response = Response(
                {'error': 'Refresh token is invalid or expired.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        return Response({'access': new_access})


# ── Logout — blacklists refresh from cookie and clears it ─────────────────────

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Try cookie first, fall back to body for backwards compat
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME) or request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token missing'}, status=400)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass  # Already expired or blacklisted — still clear cookie

        response = Response({'message': 'Logged out successfully'})
        _clear_refresh_cookie(response)
        return response


# ── Producers ─────────────────────────────────────────────────────────────────

class ProducerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProducerProfile.objects.select_related('user')
    serializer_class = ProducerListSerializer