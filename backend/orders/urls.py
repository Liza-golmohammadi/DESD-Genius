from django.urls import path
from .views import (
    CheckoutView, CustomerOrderListView, CustomerOrderDetailView,
    ReorderView, ProducerOrderListView, ProducerOrderStatusView,
    RecurringOrderListCreateView, RecurringOrderDetailView,
    RecurringOrderPlaceNowView,
)

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', CustomerOrderListView.as_view(), name='order-list'),
    path('producer/', ProducerOrderListView.as_view(), name='producer-orders'),
    path('producer/<int:producer_order_id>/status/', 
         ProducerOrderStatusView.as_view(), name='producer-order-status'),

    # Recurring orders (restaurant feature)
    path('recurring/', RecurringOrderListCreateView.as_view(), name='recurring-orders'),
    path('recurring/<int:recurring_id>/', 
         RecurringOrderDetailView.as_view(), name='recurring-order-detail'),
    path('recurring/<int:recurring_id>/place-now/', 
         RecurringOrderPlaceNowView.as_view(), name='recurring-order-place-now'),

    path('<str:order_number>/', CustomerOrderDetailView.as_view(), 
         name='order-detail'),
    path('<str:order_number>/reorder/', ReorderView.as_view(), 
         name='reorder'),
]