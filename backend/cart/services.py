from decimal import Decimal
from django.db import transaction
from .models import Cart, CartItem
from products.models import Product


class CartService:
    @staticmethod
    def get_or_create_cart(user):
        cart, _ = Cart.objects.get_or_create(customer=user)
        return cart

    @staticmethod
    def get_cart_summary(user):
        cart = CartService.get_or_create_cart(user)

        items = (
            CartItem.objects
            .filter(cart=cart)
            .select_related("product", "product__producer")
            .order_by("product__producer__id", "product__name")
        )

        grouped = {}
        item_count = 0
        grand_total = Decimal("0.00")

        for item in items:
            producer = item.product.producer
            producer_id = producer.id
            producer_name = producer.get_full_name() or producer.username

            if producer_id not in grouped:
                grouped[producer_id] = {
                    "producer_id": producer_id,
                    "producer_name": producer_name,
                    "items": [],
                    "producer_subtotal": Decimal("0.00"),
                }

            line_total = item.line_total

            grouped[producer_id]["items"].append(item)
            grouped[producer_id]["producer_subtotal"] += line_total

            item_count += item.quantity
            grand_total += line_total

        return {
            "cart_id": cart.id,
            "item_count": item_count,
            "grand_total": grand_total,
            "producers": list(grouped.values()),
        }

    @staticmethod
    @transaction.atomic
    def add_item(user, product_id, quantity):
        if getattr(user, "role", None) != "customer":
            raise ValueError("Only customers can use the cart.")

        if quantity <= 0:
            raise ValueError("Quantity must be greater than 0.")

        product = Product.objects.select_for_update().get(id=product_id)

        if not product.is_orderable():
            raise ValueError("This product is not currently available.")

        cart = CartService.get_or_create_cart(user)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )

        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > product.stock_quantity:
                raise ValueError("Requested quantity exceeds available stock.")
            item.quantity = new_quantity
            item.save()
        else:
            if quantity > product.stock_quantity:
                raise ValueError("Requested quantity exceeds available stock.")

        return item

    @staticmethod
    @transaction.atomic
    def update_item(user, product_id, quantity):
        if getattr(user, "role", None) != "customer":
            raise ValueError("Only customers can use the cart.")

        cart = CartService.get_or_create_cart(user)

        try:
            item = CartItem.objects.select_related("product").get(cart=cart, product_id=product_id)
        except CartItem.DoesNotExist:
            raise Product.DoesNotExist

        if quantity <= 0:
            item.delete()
            return None

        if quantity > item.product.stock_quantity:
            raise ValueError("Requested quantity exceeds available stock.")

        if not item.product.is_orderable():
            raise ValueError("This product is not currently available.")

        item.quantity = quantity
        item.save()
        return item

    @staticmethod
    @transaction.atomic
    def remove_item(user, product_id):
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()

    @staticmethod
    @transaction.atomic
    def clear_cart(user):
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart).delete()