from django.urls import path
from .views import LoginView, LogoutView, ProducerListView, ProducerDetailView, MeView, CustomerRegisterView, ProducerRegisterView

urlpatterns = [
	path("auth/register/customer/", CustomerRegisterView.as_view()),
	path("auth/register/producer/", ProducerRegisterView.as_view()),
	path('auth/user/me/', MeView.as_view(), name='user-update'),
	path("auth/login/", LoginView.as_view(), name="login"),
	path("auth/logout/", LogoutView.as_view(), name="logout"),
	# path("auth/user/", UserView.as_view(), name="user"),
	path('producers/', ProducerListView.as_view(), name='producer-list'),
    path('producers/<int:pk>/', ProducerDetailView.as_view(), name='producer-detail'),
    # path('producer/me/', ProducerMeView.as_view(), name='producer-me'),
]
