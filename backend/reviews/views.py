from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404

from products.models import Product
from .models import Review
from .serializers import (
    ReviewSerializer,
    ReviewCreateSerializer,
    ProductReviewSummarySerializer,
)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    queryset = Review.objects.all()

    def get_queryset(self):
        queryset = Review.objects.select_related(
            'product', 'customer', 'producer_order'
        )
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            ReviewSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(
        detail=False,
        methods=['get'],
        url_path='product/(?P<product_id>\d+)',
        permission_classes=[IsAuthenticated]
    )
    def product_reviews(self, request, product_id=None):
        product = get_object_or_404(Product, id=product_id)
        reviews = Review.objects.filter(product=product).select_related(
            'customer', 'producer_order'
        )

        # Calculate statistics
        stats = reviews.aggregate(
            average_rating=Avg('rating'),
            total_reviews=Count('id'),
        )

        rating_distribution = {
            '5': reviews.filter(rating=5).count(),
            '4': reviews.filter(rating=4).count(),
            '3': reviews.filter(rating=3).count(),
            '2': reviews.filter(rating=2).count(),
            '1': reviews.filter(rating=1).count(),
        }

        data = {
            'product_id': product.id,
            'product_name': product.name,
            'average_rating': stats['average_rating'] or 0,
            'total_reviews': stats['total_reviews'],
            'rating_distribution': rating_distribution,
            'reviews': ReviewSerializer(reviews, many=True).data,
        }

        return Response(data)

    @action(
        detail=False,
        methods=['get'],
        url_path='my-reviews',
        permission_classes=[IsAuthenticated]
    )
    def my_reviews(self, request):
        reviews = Review.objects.filter(customer=request.user).select_related(
            'product', 'producer_order'
        )
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        url_path='mark-helpful',
        permission_classes=[IsAuthenticated]
    )
    def mark_helpful(self, request, pk=None):
        review = self.get_object()
        review.helpful_count += 1
        review.save()
        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_200_OK
        )
