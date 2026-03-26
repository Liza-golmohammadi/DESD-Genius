from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomerProfile, ProducerProfile

User = get_user_model()

# Custom token
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['user_id'] = user.id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['user_id'] = self.user.id
        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'first_name', 'last_name', 'role', 'phone_number', 'terms_accepted', 'accepted_terms_at')
        read_only_fields = ["id", "role", "accepted_terms_at"]
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

# Registration
class CustomerRegistrationSerializer(serializers.Serializer):
    user = UserSerializer()
    class Meta:
        model = CustomerProfile
        fields = ('user', 'account_type', 'address', 'postcode')

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = UserSerializer().create({**user_data, 'role': 'CUSTOMER'})
        profile = CustomerProfile.objects.create(user=user, **validated_data)
        return profile


class ProducerRegistrationSerializer(serializers.Serializer):
    user = UserSerializer()
    class Meta:
        model = ProducerProfile
        fields = ('user', 'store_name', 'store_description', 'store_address', 'store_postcode', 'farm_story')
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user = User.objects.create_user(**user_data, role='PRODUCER')
        ProducerProfile.objects.create(user=user, **validated_data)
        return user


# Profile Update
class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone_number = serializers.CharField(source='user.phone_number')
    role = serializers.CharField(source='user.rike')
    

    class Meta:
        model = CustomerProfile
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'role', 'account_type', 'address', 'post_code')
        read_only_fields = ['role']
        
    def validate_email(self, value):
        user = self.instance.user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

		# Update User fields
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()
        
		# Update CustomerProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


class ProducerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone_number = serializers.CharField(source='user.phone_number')
    role = serializers.CharField(source='user.rike')

    class Meta:
        model = ProducerProfile
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'role', 'store_name', 'store_description', 'store_address', 'store_postcode' 'farm_story', 'store_created_at')
        read_only_fields = ['role', 'store_created_at']

    def validate_email(self, value):
        user = self.instance.user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

		# Update User fields
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()
        
		# Update ProducerProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance

# Public producer profiles
class ProducerPublicSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    phone_number = serializers.CharField(source='user.phone_number')
    
    class Meta:
        model = ProducerProfile
        fields = ('id', 'store_name', 'store_description', 'email', 'phone_number', 'store_address', 'store_postcode' 'farm_story')
        read_only_fields = fields