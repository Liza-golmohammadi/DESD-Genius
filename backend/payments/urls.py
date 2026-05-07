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
    ProducerSettlementListView,
    ProducerSettlementSummaryView,
    ProducerSettlementReportDownloadView,
    WeeklySettlementCycleListView,
    SettlementMarkAsPaidView,
)

urlpatterns = [
    # Stripe: create a PaymentIntent before the user enters card details
    path("create-intent/", CreatePaymentIntentView.as_view(), name="create_payment_intent"),

    # Producer settlement endpoints (TC-012)
    path("producer/settlements/", ProducerSettlementListView.as_view(), name="producer_settlements"),
    path("producer/settlements/summary/", ProducerSettlementSummaryView.as_view(), name="producer_settlement_summary"),
    path("producer/settlements/report/", ProducerSettlementReportDownloadView.as_view(), name="producer_settlement_report"),

    # Admin settlement endpoints
    path("cycles/", WeeklySettlementCycleListView.as_view(), name="settlement_cycles"),
    path("mark-as-paid/", SettlementMarkAsPaidView.as_view(), name="mark_settlements_paid"),

    # Legacy reporting
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