from django.urls import path
from .views import RecipeListCreateView, RecipeDetailView

urlpatterns = [
    path("", RecipeListCreateView.as_view(), name="recipe-list-create"),
    path("<int:recipe_id>/", RecipeDetailView.as_view(), name="recipe-detail"),
]
