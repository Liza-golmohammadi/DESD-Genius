from django.urls import path
from . import views

urlpatterns = [
    # Cart
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/items/', views.CartItemListCreateView.as_view(), name='cart-items'),
    path('cart/items/<int:item_id>/', views.CartItemDetailView.as_view(), name='cart-item-detail'),
    path('cart/clear/', views.CartClearView.as_view(), name='cart-clear'),

    # Checkout
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),

    # Customer order history
    path('', views.OrderListView.as_view(), name='order-list'),
    path('<uuid:order_number>/', views.OrderDetailView.as_view(), name='order-detail'),

    # Producer
    path('producer/', views.ProducerOrdersView.as_view(), name='producer-orders'),
    path('producer/<int:order_id>/status/', views.ProducerOrderStatusView.as_view(), name='producer-order-status'),
]
