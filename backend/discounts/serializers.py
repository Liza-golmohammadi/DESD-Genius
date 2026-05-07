from rest_framework import serializers
from django.utils import timezone
from .models import Coupon, ProductDiscount


class CouponSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()
    current_uses = serializers.SerializerMethodField()
    discount_display = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id',
            'code',
            'description',
            'discount_type',
            'discount_value',
            'maximum_discount',
            'minimum_order_value',
            'is_active',
            'is_valid',
            'max_uses',
            'current_uses',
            'valid_from',
            'valid_until',
            'discount_display',
        ]
        read_only_fields = [
            'id',
            'is_valid',
            'current_uses',
            'discount_display',
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_current_uses(self, obj):
        if obj.max_uses:
            return obj.coupon_uses.count()
        return None

    def get_discount_display(self, obj):
        if obj.discount_type == 'percentage':
            return f"{obj.discount_value}% off"
        else:
            return f"£{obj.discount_value} off"


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)

    def validate_code(self, value):
        try:
            self.coupon = Coupon.objects.get(code=value.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Coupon code not found")
        return value.upper()

    def validate(self, data):
        coupon = self.coupon
        subtotal = data['subtotal']
        request = self.context.get('request')

        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")

        # Check if coupon is valid
        if not coupon.is_valid():
            if not coupon.is_active:
                raise serializers.ValidationError("This coupon is no longer active")
            if timezone.now() < coupon.valid_from:
                raise serializers.ValidationError(f"This coupon is not yet valid")
            if coupon.valid_until and timezone.now() > coupon.valid_until:
                raise serializers.ValidationError("This coupon has expired")
            if coupon.max_uses and coupon.coupon_uses.count() >= coupon.max_uses:
                raise serializers.ValidationError("This coupon has reached its usage limit")

        # Check minimum order value
        if subtotal < coupon.minimum_order_value:
            raise serializers.ValidationError(
                f"Minimum order value of £{coupon.minimum_order_value} required for this coupon"
            )

        # Check user usage limit
        user_uses = coupon.coupon_uses.filter(user=request.user).count()
        if user_uses >= coupon.max_uses_per_user:
            raise serializers.ValidationError(
                f"You have already used this coupon {coupon.max_uses_per_user} time(s)"
            )

        data['coupon'] = coupon
        return data


class CouponApplicationSerializer(serializers.Serializer):
    coupon_code = serializers.CharField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2)


class ProductDiscountSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    original_price = serializers.DecimalField(
        source='product.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    discounted_price = serializers.SerializerMethodField()

    class Meta:
        model = ProductDiscount
        fields = [
            'id',
            'product_id',
            'product_name',
            'original_price',
            'discounted_price',
            'discount_percentage',
            'reason',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_discounted_price(self, obj):
        return obj.get_discounted_price()
