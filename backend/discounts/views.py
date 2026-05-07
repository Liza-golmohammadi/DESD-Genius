from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from .models import Coupon, ProductDiscount, CouponUse
from .serializers import (
    CouponSerializer,
    ApplyCouponSerializer,
    CouponApplicationSerializer,
    ProductDiscountSerializer,
)


class CouponViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]
    queryset = Coupon.objects.filter(is_active=True)

    @action(
        detail=False,
        methods=['post'],
        url_path='apply',
        permission_classes=[IsAuthenticated]
    )
    def apply_coupon(self, request):
        """Apply a coupon code and get discount amount"""
        serializer = ApplyCouponSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        coupon = serializer.validated_data['coupon']
        subtotal = serializer.validated_data['subtotal']

        discount_amount = coupon.get_discount_amount(subtotal)

        response_data = {
            'coupon_code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
            'discount_amount': discount_amount,
            'final_total': subtotal - discount_amount,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=['post'],
        url_path='validate',
        permission_classes=[IsAuthenticated]
    )
    def validate_coupon(self, request):
        """Validate if a coupon code is valid"""
        code = request.data.get('code', '').upper()

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response(
                {'valid': False, 'message': 'Coupon code not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not coupon.is_valid():
            return Response(
                {'valid': False, 'message': 'This coupon is no longer valid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check user usage limit
        user_uses = coupon.coupon_uses.filter(user=request.user).count()
        if user_uses >= coupon.max_uses_per_user:
            return Response(
                {'valid': False, 'message': f'You have already used this coupon {coupon.max_uses_per_user} time(s)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CouponSerializer(coupon)
        return Response({**serializer.data, 'valid': True}, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=['get'],
        url_path='my-history',
        permission_classes=[IsAuthenticated]
    )
    def coupon_history(self, request):
        """Get user's coupon usage history"""
        uses = CouponUse.objects.filter(user=request.user).select_related('coupon')
        data = [
            {
                'coupon_code': use.coupon.code,
                'discount_value': use.coupon.discount_value,
                'discount_type': use.coupon.discount_type,
                'used_at': use.used_at,
            }
            for use in uses
        ]
        return Response(data)


class ProductDiscountViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductDiscountSerializer
    queryset = ProductDiscount.objects.filter(is_active=True).select_related('product')
    permission_classes = [IsAuthenticated]

    @action(
        detail=False,
        methods=['get'],
        url_path='active',
    )
    def active_discounts(self, request):
        """Get all active product discounts"""
        discounts = self.get_queryset()
        serializer = self.get_serializer(discounts, many=True)
        return Response(serializer.data)
