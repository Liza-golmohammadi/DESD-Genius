from django.urls import path
from .views import test_pay

app_name = "payments"

urlpatterns = [
    path("test-pay/", test_pay, name="test_pay"),
]