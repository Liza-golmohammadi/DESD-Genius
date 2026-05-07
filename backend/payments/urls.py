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
    AdminCommissionReportView,
    AdminCommissionReportDownloadView,
)

urlpatterns = [
    path("create-intent/", CreatePaymentIntentView.as_view(), name="create_payment_intent"),

    path("producer/settlements/", ProducerSettlementListView.as_view(), name="producer_settlements"),
    path("producer/settlements/summary/", ProducerSettlementSummaryView.as_view(), name="producer_settlement_summary"),
    path("producer/settlements/report/", ProducerSettlementReportDownloadView.as_view(), name="producer_settlement_report"),

    path("cycles/", WeeklySettlementCycleListView.as_view(), name="settlement_cycles"),
    path("mark-as-paid/", SettlementMarkAsPaidView.as_view(), name="mark_settlements_paid"),

    path("reports/settlements/", SettlementReportView.as_view(), name="settlement_report"),
    path("reports/commission/", AdminCommissionReportView.as_view(), name="admin_commission_report"),
    path("reports/commission/export/", AdminCommissionReportDownloadView.as_view(), name="admin_commission_report_export"),

    path("settlements/", SettlementListView.as_view(), name="settlement_list"),
    path("settlements/<int:settlement_id>/", SettlementDetailView.as_view(), name="settlement_detail"),
    path("settlements/<int:settlement_id>/status/", SettlementStatusUpdateView.as_view(), name="settlement_status_update"),

    path("", PaymentListView.as_view(), name="payment_list"),
    path("<str:order_ref>/status/", PaymentStatusUpdateView.as_view(), name="payment_status_update"),
    path("<str:order_ref>/", PaymentDetailView.as_view(), name="payment_detail"),
]
