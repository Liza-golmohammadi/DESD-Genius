from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import *

urlpatterns = [
    # Auth
    path('login/', CustomTokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),

    # Registration (two separate forms)
    path('register/customer/', RegisterCustomerView.as_view()),
    path('register/producer/', RegisterProducerView.as_view()),

    # Profile (auto-detects role)
    path('me/', MyProfileView.as_view()),

    # Public producer browsing
    path('producers/', ProducerListView.as_view()),
    path('producers/<int:pk>/', ProducerDetailView.as_view()),
]
