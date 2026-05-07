from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Recipe
from .serializers import RecipeSerializer


class RecipeListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Recipe.objects.select_related("producer")

        # Filter by producer
        producer_id = request.query_params.get("producer_id")
        if producer_id:
            qs = qs.filter(producer_id=producer_id)

        serializer = RecipeSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if getattr(request.user, "role", None) != "producer":
            return Response(
                {"error": "Only producers can create recipes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RecipeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(producer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RecipeDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, recipe_id):
        try:
            recipe = Recipe.objects.select_related("producer").get(id=recipe_id)
        except Recipe.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(RecipeSerializer(recipe).data)