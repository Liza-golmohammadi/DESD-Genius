from api.serializers import UserSerializer
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate


User = get_user_model()

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
			return Response({"error": "Invalid creditentials"}, status=400)

		refresh = RefreshToken.for_user(user)

		return Response({
			"access": str(refresh.access_token),
			"refresh": str(refresh),
			"role": user.role,
			"email": user.email,
			"username": user.username
		})
	
class UserView(generics.RetrieveAPIView):
    #queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
	
    def get_object(self):
        return self.request.user