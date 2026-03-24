from .models import ProducerProfile
from .serializers import UserSerializer, ProducerSerializer, UserUpdateSerializer, CustomerRegisterSerializer, ProducerRegisterSerializer
from rest_framework import generics, permissions, status
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
	
""" class UserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
	
    def get_object(self):
        return self.request.user """
	
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
	queryset = ProducerProfile.objects.select_related('user').all()
	serializer_class = ProducerSerializer
	permission_classes = [AllowAny]

class ProducerDetailView(generics.RetrieveAPIView):
    serializer_class = ProducerSerializer
    permission_classes = [AllowAny]
    def get_object(self):
        user_id = self.kwargs.get('pk')  # 'pk' comes from URL
        try:
            return ProducerProfile.objects.select_related('user').get(user_id=user_id)
        except ProducerProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Producer not found")
""" class ProducerMeView(generics.RetrieveUpdateAPIView):
	queryset = ProducerProfile.objects.select_related('user').all()
	serializer_class = ProducerProfileSerializer
	permission_classes = [IsProducer]

	def get_object(self):
		try:
			return ProducerProfile.objects.get(user=self.request.user)
		except ProducerProfile.DoesNotExist:
			raise NotFound("Producer not found") """
