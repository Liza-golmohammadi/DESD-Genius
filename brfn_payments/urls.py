from django.urls import path
from .views import payments_page, test_pay

app_name = "payments"

urlpatterns = [
    path("", payments_page, name="payments_page"),
    path("test-pay/", test_pay, name="test_pay"),
]