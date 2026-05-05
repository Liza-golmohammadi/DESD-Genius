from django.urls import path
from . import views

urlpatterns = [
    # Public endpoints (Home / storefront)
    path("categories/", views.CategoryListView.as_view(), name="product-categories"),
    path("", views.PublicProductListView.as_view(), name="products-public-list"),
    path("<int:product_id>/", views.PublicProductDetailView.as_view(), name="product-public-detail"),

    # Producer endpoints (Dashboard)
    path("mine/", views.ProducerProductListCreateView.as_view(), name="producer-products"),
    path("mine/<int:product_id>/", views.ProducerProductDetailView.as_view(), name="producer-product-detail"),

    # Internal service endpoints (stock reservation)
    path("<int:product_id>/reserve/", views.ProductStockReserveView.as_view(), name="product-stock-reserve"),
    path("<int:product_id>/release/", views.ProductStockReleaseView.as_view(), name="product-stock-release"),
]
