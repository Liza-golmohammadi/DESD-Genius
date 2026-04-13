from django.urls import path
from . import views

urlpatterns = [
    path('', views.PaymentListCreateView.as_view(), name='payment-list-create'),
    path('<uuid:payment_ref>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('order/<uuid:order_number>/', views.PaymentByOrderView.as_view(), name='payment-by-order'),
]
