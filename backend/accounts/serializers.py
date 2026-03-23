from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Producer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = ["id", "is_active"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        # If your custom user uses username internally, map email -> username
        validated_data["username"] = validated_data["email"]

        user = User.objects.create_user(**validated_data)
        user.is_active = True  # for otp, modify later
        user.save()

        # Auto-create Producer record when role is producer
        if user.role == "producer":
            Producer.objects.create(user=user)

        return user

    def update(self, instance, validated_data):
        """
        IMPORTANT: ensure passwords are hashed on update.
        Without this, PATCH password will store raw text and login will fail.
        """
        password = validated_data.pop("password", None)

        # Update normal fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Hash password properly
        if password:
            instance.set_password(password)

        instance.save()
        return instance


class ProducerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = Producer
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "store_name",
            "description",
            "contact_info",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]