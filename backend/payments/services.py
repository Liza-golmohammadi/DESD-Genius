from decimal import Decimal, ROUND_HALF_UP

from .models import Payment, Settlement


class PaymentService:
    COMMISSION_RATE = Decimal("0.05")

    @staticmethod
    def initiate_payment(order):
        """
        Creates or updates:
        1. One order-level Payment record.
        2. One producer-level Settlement record for each ProducerOrder.

        This keeps payment/commission evidence connected to checkout.
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
                # Mock/test payment mode: treat payment as paid immediately.
                "status": "PAID",
            },
        )

        settlements = []

        for producer_order in order.producer_orders.select_related("producer").all():
            settlement_commission, settlement_payout = Settlement.calculate(
                Decimal(str(producer_order.subtotal))
            )

            settlement, settlement_created = Settlement.objects.update_or_create(
                producer_order=producer_order,
                defaults={
                    "producer": producer_order.producer,
                    "order": order,
                    "subtotal": producer_order.subtotal,
                    "commission_amount": settlement_commission,
                    "payout_amount": settlement_payout,
                    "status": "PENDING",
                },
            )

            settlements.append(
                {
                    "producer_order_id": producer_order.id,
                    "producer_id": producer_order.producer.id,
                    "subtotal": str(settlement.subtotal),
                    "commission_amount": str(settlement.commission_amount),
                    "payout_amount": str(settlement.payout_amount),
                    "status": settlement.status,
                    "created": settlement_created,
                }
            )

        return {
            "order_ref": payment.order.order_number,
            "total_amount": str(payment.total_amount),
            "commission_amount": str(payment.commission_amount),
            "status": payment.status,
            "created": created,
            "settlements": settlements,
        }