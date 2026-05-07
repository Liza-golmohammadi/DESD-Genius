from decimal import Decimal, ROUND_HALF_UP


class SettlementService:
    '''
    Service class for producer payment settlements.

    The marketplace takes a 5% network commission and pays 95%
    of the order value to producers.
    '''

    COMMISSION_RATE = Decimal("0.05")
    PRODUCER_RATE = Decimal("0.95")

    @staticmethod
    def money(value):
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    def calculate_commission(cls, order_total):
        order_total = cls.money(order_total)
        return cls.money(order_total * cls.COMMISSION_RATE)

    @classmethod
    def calculate_producer_payment(cls, order_total):
        order_total = cls.money(order_total)
        return cls.money(order_total * cls.PRODUCER_RATE)

    @classmethod
    def calculate_settlement(cls, order_total):
        order_total = cls.money(order_total)
        commission = cls.calculate_commission(order_total)
        producer_payment = cls.calculate_producer_payment(order_total)

        return {
            "order_total": order_total,
            "commission_rate": cls.COMMISSION_RATE,
            "commission_amount": commission,
            "producer_payment": producer_payment,
        }

    @classmethod
    def calculate_multi_vendor_settlement(cls, producer_totals):
        '''
        producer_totals example:
        {
            "Producer A": 80,
            "Producer B": 70
        }
        '''
        result = {}
        total_order_value = Decimal("0.00")

        for producer, amount in producer_totals.items():
            amount = cls.money(amount)
            total_order_value += amount
            result[producer] = cls.calculate_settlement(amount)

        return {
            "total_order_value": cls.money(total_order_value),
            "network_commission": cls.calculate_commission(total_order_value),
            "producer_settlements": result,
        }
