from django.urls import path
from .views import RegisterView, LoginView, UserView, LogoutView, ProducerListView, ProducerDetailView, ProducerMeView

urlpatterns = [
	path("auth/register/", RegisterView.as_view(), name="register"),
	path("auth/login/", LoginView.as_view(), name="login"),
	path("auth/logout/", LogoutView.as_view(), name="logout"),
	path("auth/user/", UserView.as_view(), name="user"),
	path('producers/', ProducerListView.as_view(), name='producer-list'),
    path('producers/<int:pk>/', ProducerDetailView.as_view(), name='producer-detail'),
    path('producer/me/', ProducerMeView.as_view(), name='producer-me'),
]
