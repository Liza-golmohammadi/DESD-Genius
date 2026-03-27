from django.urls import path
from .views import LogoutView, ProducerListView, ProducerDetailView, MeView, CustomerRegisterView, ProducerRegisterView

urlpatterns = [
	path("register/customer/", CustomerRegisterView.as_view()),
	path("register/producer/", ProducerRegisterView.as_view()),
	path('me/', MeView.as_view(), name='user-update'),
	path("logout/", LogoutView.as_view(), name="logout"),
	path('producers/', ProducerListView.as_view(), name='producer-list'),
    path('producers/<int:pk>/', ProducerDetailView.as_view(), name='producer-detail')
]