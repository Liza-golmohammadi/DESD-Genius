from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import ProducerProfile

User = get_user_model()


class ProducerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProducerProfile
        fields = [
            "store_name",
            "store_description",
            "store_contact",
            "store_address",
            "store_created_at",
        ]


class UserSerializer(serializers.ModelSerializer):
    producer_profile = ProducerProfileSerializer(read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
            "is_active",
            "phone_number",
            "phone",
            "address",
            "postcode",
            "delivery_address",
            "customer_role",
            "is_producer",
            "accepted_terms_at",
            "producer_profile",
        ]
        read_only_fields = ["id", "is_producer", "accepted_terms_at"]


class UserUpdateSerializer(serializers.ModelSerializer):
    producer_profile = ProducerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "phone",
            "address",
            "postcode",
            "delivery_address",
            "customer_role",
            "is_producer",
            "role",
            "producer_profile",
        ]
        read_only_fields = ["id", "is_producer", "role"]

    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def update(self, instance, validated_data):
        producer_data = validated_data.pop("producer_profile", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if producer_data and instance.is_producer:
            profile, created = ProducerProfile.objects.get_or_create(user=instance)
            for attr, value in producer_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    accepted_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "accepted_terms",
            "first_name",
            "last_name",
            "customer_role",
            "phone",
            "phone_number",
            "address",
            "postcode",
            "delivery_address",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if not attrs.get("accepted_terms"):
            raise serializers.ValidationError({"accepted_terms": "You must accept T&C."})

        if not attrs.get("customer_role"):
            raise serializers.ValidationError({"customer_role": "Customer role is required."})

        return attrs

    def create(self, validated_data):
        validated_data.pop("accepted_terms")
        password = validated_data.pop("password")

        # Keep both phone fields consistent if only one is provided by the frontend.
        if validated_data.get("phone") and not validated_data.get("phone_number"):
            validated_data["phone_number"] = validated_data["phone"]

        if validated_data.get("phone_number") and not validated_data.get("phone"):
            validated_data["phone"] = validated_data["phone_number"]

        user = User.objects.create_user(
            email=validated_data.pop("email"),
            password=password,
            is_active=True,
            **validated_data,
        )
        user.mark_terms_accepted()
        user.save()
        return user


class ProducerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    accepted_terms = serializers.BooleanField(write_only=True)

    store_name = serializers.CharField(max_length=100)
    store_description = serializers.CharField(required=False, allow_blank=True)
    store_contact = serializers.CharField(required=False, allow_blank=True)
    store_address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "accepted_terms",
            "first_name",
            "last_name",
            "phone",
            "phone_number",
            "address",
            "postcode",
            "store_name",
            "store_description",
            "store_contact",
            "store_address",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if not attrs.get("accepted_terms"):
            raise serializers.ValidationError({"accepted_terms": "You must accept T&C."})

        if not attrs.get("store_name"):
            raise serializers.ValidationError({"store_name": "Store name is required for producers."})

        return attrs

    def create(self, validated_data):
        validated_data.pop("accepted_terms")

        store_name = validated_data.pop("store_name", "")
        store_description = validated_data.pop("store_description", "")
        store_contact = validated_data.pop("store_contact", "")
        store_address = validated_data.pop("store_address", "")

        password = validated_data.pop("password")

        # Keep both phone fields consistent if only one is provided by the frontend.
        if validated_data.get("phone") and not validated_data.get("phone_number"):
            validated_data["phone_number"] = validated_data["phone"]

        if validated_data.get("phone_number") and not validated_data.get("phone"):
            validated_data["phone"] = validated_data["phone_number"]

        user = User.objects.create_user(
            email=validated_data.pop("email"),
            password=password,
            is_producer=True,
            is_active=True,
            role="producer",
            customer_role=None,
            **validated_data,
        )
        user.mark_terms_accepted()
        user.save()

        user.producer_profile.store_name = store_name
        user.producer_profile.store_description = store_description
        user.producer_profile.store_contact = store_contact
        user.producer_profile.store_address = store_address
        user.producer_profile.save()

        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class ProducerListSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = ProducerProfile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "store_name",
            "store_description",
            "store_contact",
            "store_address",
            "store_created_at",
            "description",
            "contact_info",
            "farm_story",
            "created_at",
        ]


class ProducerDetailSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    products = serializers.SerializerMethodField()

    class Meta:
        model = ProducerProfile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "store_name",
            "store_description",
            "store_contact",
            "store_address",
            "store_created_at",
            "farm_story",
            "products",
        ]

    def get_products(self, obj):
        from products.serializers import ProductListSerializer

        products = obj.user.products.filter(is_available=True)
        return ProductListSerializer(products, many=True).data