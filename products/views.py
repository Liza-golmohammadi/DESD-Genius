from django.db.models import Q
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
    return getattr(user, "is_authenticated", False) and getattr(user, "role", None) == "producer"

def _is_admin(user) -> bool:
    return getattr(user, "is_authenticated", False) and getattr(user, "role", None) == "admin"


class CategoryListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Category.objects.all().order_by("name")
        return Response(CategorySerializer(qs, many=True).data)


class ProductListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Product.objects.select_related("category", "producer")

        if _is_admin(request.user):
            pass
        elif _is_producer(request.user):
            public_ids = Product.objects.visible_to_customers().values_list("id", flat=True)
            qs = qs.filter(Q(id__in=public_ids) | Q(producer=request.user))
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

        return Response(ProductListSerializer(qs.order_by("name"), many=True).data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if not _is_producer(request.user):
            return Response({"error": "Only producers can create products."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save(producer=request.user)
        return Response(ProductDetailSerializer(product).data, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id: int):
        try:
            product = Product.objects.select_related("category", "producer").get(id=product_id)
        except Product.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not product.is_orderable():
            if _is_admin(request.user):
                pass
            elif _is_producer(request.user) and product.producer_id == request.user.id:
                pass
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(ProductDetailSerializer(product).data)


class ProductInventoryUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, product_id: int):
        if not _is_producer(request.user):
            return Response({"error": "Only producers can update inventory."}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if product.producer_id != request.user.id:
            return Response({"error": "You can only update your own products."}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = {"stock_quantity", "low_stock_threshold", "is_available", "available_from", "available_to"}
        for field in list(request.data.keys()):
            if field not in allowed_fields:
                return Response({"error": f"Field '{field}' is not allowed here."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductCreateSerializer(instance=product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProductDetailSerializer(product).data)