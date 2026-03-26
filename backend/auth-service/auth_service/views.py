from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import CustomerProfile, ProducerProfile
from .serializers import (
    CustomTokenObtainPairSerializer,
    CustomerRegistrationSerializer,
    ProducerRegistrationSerializer,
    CustomerProfileSerializer,
    ProducerProfileSerializer,
    ProducerPublicSerializer,
)

# ─── Login ───────────────────────────────────────────────────────
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ─── Registration (two separate endpoints) ──────────────────────
class RegisterCustomerView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CustomerRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Customer registered"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterProducerView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ProducerRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Producer registered"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Profile Update (each user updates their own) ───────────────
class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'CUSTOMER':
            profile = CustomerProfile.objects.get(user=request.user)
            serializer = CustomerProfileSerializer(profile)
        else:
            profile = ProducerProfile.objects.get(user=request.user)
            serializer = ProducerProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role == 'CUSTOMER':
            profile = CustomerProfile.objects.get(user=request.user)
            serializer = CustomerProfileSerializer(profile, data=request.data, partial=True)
        else:
            profile = ProducerProfile.objects.get(user=request.user)
            serializer = ProducerProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Public Producer List (customers can browse) ────────────────
class ProducerListView(generics.ListAPIView):
    """Anyone can view the list of producers and their store info."""
    queryset = ProducerProfile.objects.all()
    serializer_class = ProducerPublicSerializer
    permission_classes = [permissions.AllowAny]


class ProducerDetailView(generics.RetrieveAPIView):
    """Anyone can view a specific producer's details."""
    queryset = ProducerProfile.objects.all()
    serializer_class = ProducerPublicSerializer
    permission_classes = [permissions.AllowAny]
