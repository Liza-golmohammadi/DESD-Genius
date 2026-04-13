from django.urls import path
from .views import LogoutView, MeView, CustomerRegisterView, ProducerRegisterView, ProducerViewSet, CustomTokenObtainPairView
from rest_framework.routers import DefaultRouter



urlpatterns = [
	path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
	path("register/customer/", CustomerRegisterView.as_view()),
	path("register/producer/", ProducerRegisterView.as_view()),
	path('me/', MeView.as_view(), name='user-update'),
	path("logout/", LogoutView.as_view(), name="logout"),

]

router = DefaultRouter()
router.register(r'producers', ProducerViewSet)

urlpatterns += router.urls