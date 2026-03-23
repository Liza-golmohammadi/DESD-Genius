from decimal import Decimal, ROUND_HALF_UP
from .models import Payment


class PaymentService:
    COMMISSION_RATE = Decimal("0.05")

    @staticmethod
    def initiate_payment(order):
        """
        Creates or updates an order-level Payment record.
        Keeps the same public interface so existing checkout flow does not break.
        """

        total_amount = Decimal(str(order.total_amount)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        commission_amount = (total_amount * PaymentService.COMMISSION_RATE).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        payment, created = Payment.objects.update_or_create(
            order=order,
            defaults={
                "total_amount": total_amount,
                "commission_amount": commission_amount,
                "status": "PAID",
            },
        )

        return {
            "order_ref": payment.order.order_number,
            "total_amount": str(payment.total_amount),
            "commission_amount": str(payment.commission_amount),
            "status": payment.status,
            "created": created,
        }