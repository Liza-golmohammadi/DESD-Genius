from django.urls import path
from .views import (
    CheckoutView, CustomerOrderListView, CustomerOrderDetailView,
    ReorderView, ProducerOrderListView, ProducerOrderStatusView
)

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', CustomerOrderListView.as_view(), name='order-list'),
    path('producer/', ProducerOrderListView.as_view(), name='producer-orders'),
    path('producer/<int:producer_order_id>/status/', 
         ProducerOrderStatusView.as_view(), name='producer-order-status'),
    path('<str:order_number>/', CustomerOrderDetailView.as_view(), 
         name='order-detail'),
    path('<str:order_number>/reorder/', ReorderView.as_view(), 
         name='reorder'),
]
