from decimal import Decimal, InvalidOperation
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json

from .models import CommissionRecord


def payments_page(request):
    return render(request, "brfn_payments/payments.html")


@csrf_exempt
@require_http_methods(["POST"])
def test_pay(request):
    order_ref = request.POST.get("order_ref", "ORD-TEST")
    total_str = request.POST.get("total", "100.00")

    try:
        total = Decimal(total_str).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return render(
            request,
            "brfn_payments/payments.html",
            {"result": "Invalid total amount"},
        )

    commission, producer_share = CommissionRecord.calculate_split(total)

    record, created = CommissionRecord.objects.update_or_create(
        order_ref=order_ref,
        defaults={
            "total_amount": total,
            "commission_amount": commission,
            "producer_amount": producer_share,
            "status": "PAID",
        },
    )

    payload = {
        "ok": True,
        "created": created,
        "order_ref": record.order_ref,
        "total": str(record.total_amount),
        "commission_5pct": str(record.commission_amount),
        "producer_share_95pct": str(record.producer_amount),
        "status": record.status,
    }

    return render(
        request,
        "brfn_payments/payments.html",
        {"result": json.dumps(payload, indent=2)},
    )