from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .services import CartService
from .serializers import CartSummarySerializer, CartItemSerializer
from products.models import Product


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        summary = CartService.get_cart_summary(request.user)
        serializer = CartSummarySerializer(summary)
        return Response(serializer.data)

    def delete(self, request):
        CartService.clear_cart(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity")

        if not product_id or quantity is None:
            return Response(
                {"error": "product_id and quantity are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = CartService.add_item(request.user, product_id, int(quantity))
            serializer = CartItemSerializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)


class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, product_id):
        quantity = request.data.get("quantity")

        if quantity is None:
            return Response(
                {"error": "quantity is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = CartService.update_item(request.user, product_id, int(quantity))

            if item:
                serializer = CartItemSerializer(item)
                return Response(serializer.data)

            return Response(status=status.HTTP_204_NO_CONTENT)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, product_id):
        CartService.remove_item(request.user, product_id)
        return Response(status=status.HTTP_204_NO_CONTENT)