from django.urls import path
from . import views

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="product-categories"),
    path("", views.ProductListCreateView.as_view(), name="products-list-create"),
    path("<int:product_id>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("<int:product_id>/inventory/", views.ProductInventoryUpdateView.as_view(), name="product-inventory"),
]