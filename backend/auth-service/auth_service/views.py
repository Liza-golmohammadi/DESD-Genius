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

class IsProducer(permissions.BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'producer'

class CustomerRegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegisterSerializer
    permission_classes = [permissions.AllowAny]

class ProducerRegisterView(generics.CreateAPIView):
    serializer_class = ProducerRegisterSerializer
    permission_classes = [permissions.AllowAny]

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
	
class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		refresh_token = request.data.get("refresh")
		if not refresh_token:
			return Response({"error" : "Refresh token missing"}, status=400)
		
		try:
			token = RefreshToken(refresh_token)
			token.blacklist()
		except TokenError:
			return Response({"error": "Invalid or expired token"}, status=400)
		return Response({"message": "Logged out successfully"})

class ProducerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProducerProfile.objects.select_related('user')
    serializer_class = ProducerListSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer