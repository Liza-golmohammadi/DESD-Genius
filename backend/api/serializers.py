from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = [
			'id', 
			'email', 
			'username', 
			'password', 
			'first_name', 
			'last_name', 
			'role', 
			'is_active']
		read_only_fields = ['id', 'is_active']
		extra_kwargs = {'password': {'write_only': True}}

	def create(self, validated_data):
		password = validated_data.pop('password')
		user = User.objects.create_user(password=password, **validated_data)
		user.is_active = True # for otp, modify later
		user.save()
		return user