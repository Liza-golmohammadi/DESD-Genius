from .models import Producer
from .serializers import UserSerializer, ProducerSerializer
from rest_framework import generics, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import NotFound
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class IsProducer(permissions.BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'producer'

class RegisterView(generics.CreateAPIView):
	serializer_class = UserSerializer
	permission_classes = [AllowAny]

class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		email = request.data.get("email")
		password = request.data.get("password")
		
		if not email or not password:
			return Response({
				"error": "Email and password required"},
				status= 400
				)

		user = authenticate(request, username=email, password=password)
		if user is None:
			return Response({"error": "Invalid credentials"}, status=400)

		refresh = RefreshToken.for_user(user)

		return Response({
			"access": str(refresh.access_token),
			"refresh": str(refresh),
			"role": user.role,
			"email": user.email,
			"username": user.username
		})
	
class UserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
	
    def get_object(self):
        return self.request.user
	
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
	
class ProducerListView(generics.ListAPIView):
	queryset = Producer.objects.select_related('user').all()
	serializer_class = ProducerSerializer
	permission_classes = [AllowAny]

class ProducerDetailView(generics.RetrieveAPIView):
	queryset = Producer.objects.select_related('user').all()
	serializer_class = ProducerSerializer
	permission_classes = [AllowAny]

class ProducerMeView(generics.RetrieveUpdateAPIView):
	queryset = Producer.objects.select_related('user').all()
	serializer_class = ProducerSerializer
	permission_classes = [IsProducer]

	def get_object(self):
		try:
			return Producer.objects.get(user=self.request.user)
		except Producer.DoesNotExist:
			raise NotFound("Producer not found")
