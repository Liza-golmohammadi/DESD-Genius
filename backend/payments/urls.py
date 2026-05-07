from django.urls import path
from .views import (
    PaymentListView,
    PaymentDetailView,
    PaymentStatusUpdateView,
    SettlementListView,
    SettlementDetailView,
    SettlementStatusUpdateView,
    SettlementReportView,
    CreatePaymentIntentView,
)

urlpatterns = [
    # Stripe: create a PaymentIntent before the user enters card details
    path("create-intent/", CreatePaymentIntentView.as_view(), name="create_payment_intent"),

    # Reporting first
    path("reports/settlements/", SettlementReportView.as_view(), name="settlement_report"),

    # Settlement endpoints
    path("settlements/", SettlementListView.as_view(), name="settlement_list"),
    path("settlements/<int:settlement_id>/", SettlementDetailView.as_view(), name="settlement_detail"),
    path("settlements/<int:settlement_id>/status/", SettlementStatusUpdateView.as_view(), name="settlement_status_update"),

    # Payment endpoints
    path("", PaymentListView.as_view(), name="payment_list"),
    path("<str:order_ref>/status/", PaymentStatusUpdateView.as_view(), name="payment_status_update"),
    path("<str:order_ref>/", PaymentDetailView.as_view(), name="payment_detail"),
]