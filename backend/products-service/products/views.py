from django.shortcuts import render

from django.db.models import Q
from django.db import transaction
from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateSerializer,
)

def _is_producer(user) -> bool:
    return getattr(user, "is_authenticated", False) and getattr(user, "is_producer", False)


def _is_internal_service_request(request) -> bool:
    expected = getattr(settings, "INTERNAL_SERVICE_TOKEN", "")
    if not expected:
        return False
    supplied = request.headers.get("X-Internal-Service-Token", "")
    return constant_time_compare(supplied, expected)

""" def _is_admin(user) -> bool:
    return getattr(user, "is_authenticated", False) and getattr(user, "role", None) == "admin" """


class CategoryListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Category.objects.all().order_by("name")
        return Response(CategorySerializer(qs, many=True).data)


class ProductListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Product.objects.select_related("category")

        # ?mine=true — producer dashboard: only this producer's products
        mine_only = request.query_params.get("mine", "").lower() == "true"

        if _is_producer(request.user) and mine_only:
            qs = qs.filter(producer_id=str(request.user.id))
        elif _is_producer(request.user):
            public_ids = Product.objects.visible_to_customers().values_list("id", flat=True)
            qs = qs.filter(Q(id__in=public_ids) | Q(producer_id=str(request.user.id)))
        else:
            qs = qs.visible_to_customers()

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(sku__icontains=search))

        organic = request.query_params.get("organic")
        if organic in ("true", "false"):
            qs = qs.filter(organic_certified=(organic == "true"))

        return Response(ProductListSerializer(qs.order_by("name"), many=True, context={"request": request}).data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _is_producer(request.user):
            return Response({"error": "Only producers can create products."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        producer_name = getattr(request.user, 'store_name', '') or ''
        product = serializer.save(producer_id=request.user.id, producer_name=producer_name)
        return Response(ProductDetailSerializer(product, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id: int):
        try:
            product = Product.objects.select_related("category").get(id=product_id)
        except Product.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not product.is_orderable():
            """ if _is_admin(request.user):
                pass """
            if _is_producer(request.user) and str(product.producer_id) == str(request.user.id):
                pass
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(ProductDetailSerializer(product, context={"request": request}).data)


class ProductInventoryUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, product_id: int):
        if not _is_producer(request.user):
            return Response({"error": "Only producers can update inventory."}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if str(product.producer_id) != str(request.user.id):
            return Response({"error": "You can only update your own products."}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = {"stock_quantity", "low_stock_threshold", "is_available", "available_from", "available_to"}
        for field in list(request.data.keys()):
            if field not in allowed_fields:
                return Response({"error": f"Field '{field}' is not allowed here."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductCreateSerializer(instance=product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProductDetailSerializer(product, context={"request": request}).data)


class ProductStockReserveView(APIView):
    """
    Internal endpoint used by checkout flow to atomically reserve stock.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, product_id: int):
        if not _is_internal_service_request(request):
            expected = getattr(settings, "INTERNAL_SERVICE_TOKEN", "")
            supplied = request.headers.get("X-Internal-Service-Token", "")
            print(f"[RESERVE] Forbidden: expected_token_set={bool(expected)} supplied_token_set={bool(supplied)} match={expected == supplied}")
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        quantity = request.data.get("quantity")
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({"error": "quantity must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"error": "quantity must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

            if not product.is_orderable():
                return Response(
                    {"error": "Product is not currently orderable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if product.stock_quantity < quantity:
                return Response(
                    {
                        "error": "Insufficient stock.",
                        "available_stock": product.stock_quantity,
                        "requested_quantity": quantity,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            product.stock_quantity -= quantity
            product.save(update_fields=["stock_quantity", "updated_at"])

        return Response({"product_id": product_id, "reserved_quantity": quantity}, status=status.HTTP_200_OK)


class ProductStockReleaseView(APIView):
    """
    Internal compensating endpoint to release previously reserved stock.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, product_id: int):
        if not _is_internal_service_request(request):
            return Response({"error": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        quantity = request.data.get("quantity")
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({"error": "quantity must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"error": "quantity must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

            product.stock_quantity += quantity
            product.save(update_fields=["stock_quantity", "updated_at"])

        return Response({"product_id": product_id, "released_quantity": quantity}, status=status.HTTP_200_OK)
