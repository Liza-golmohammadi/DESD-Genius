from .models import Cart, CartItem
from products.models import Product
from decimal import Decimal
from django.db import transaction
from .food_miles import calculate_food_miles

class CartService:

    @staticmethod
    def get_or_create_cart(user):
        if user.role != 'customer':
            raise PermissionError("Only customers can have a cart.")
        cart, created = Cart.objects.get_or_create(customer=user)
        return cart

    @staticmethod
    def add_item(user, product_id, quantity):
        cart = CartService.get_or_create_cart(user)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise

        if not product.is_available:
            raise ValueError(f"Product {product.name} is not available.")

        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

        # Check existing cart item quantity
        cart_item = CartItem.objects.filter(cart=cart, product=product).first()
        existing_quantity = cart_item.quantity if cart_item else 0
        
        if existing_quantity + quantity > product.stock_quantity:
            raise ValueError(f"Adding these items would exceed available stock.")

        if cart_item:
            cart_item.quantity += quantity
            cart_item.save()
        else:
            cart_item = CartItem.objects.create(cart=cart, product=product, quantity=quantity)
        
        return cart_item

    @staticmethod
    def update_item(user, product_id, quantity):
        if quantity <= 0:
            CartService.remove_item(user, product_id)
            return None

        cart = CartService.get_or_create_cart(user)
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise

        if quantity > product.stock_quantity:
            raise ValueError(f"Requested quantity exceeds available stock.")

        cart_item = CartItem.objects.filter(cart=cart, product=product).first()
        if cart_item:
            cart_item.quantity = quantity
            cart_item.save()
            return cart_item
        return None

    @staticmethod
    def remove_item(user, product_id):
        cart = CartService.get_or_create_cart(user)
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()

    @staticmethod
    def clear_cart(user):
        cart = CartService.get_or_create_cart(user)
        cart.items.all().delete()

    @staticmethod
    def get_cart_summary(user):
        cart = CartService.get_or_create_cart(user)
        
        # Use select_related('product__producer') to avoid N+1 queries
        items = cart.items.select_related('product__producer').order_by('product__producer_id')
        
        producers_dict = {}
        grand_total = Decimal('0.00')
        food_miles_total = Decimal('0.00')
        item_count = 0

        # Get the customer's postcode for dynamic food miles calculation
        customer_postcode = getattr(user, 'postcode', None)

        # Cache postcode-based distances per producer so we don't call the API repeatedly
        producer_distances = {}

        for item in items:
            producer = item.product.producer
            p_id = producer.id

            if p_id not in producers_dict:
                producers_dict[p_id] = {
                    'producer_id': p_id,
                    'producer_name': producer.get_full_name() or producer.email,
                    'items': [],
                    'producer_subtotal': Decimal('0.00'),
                }

            line_total = item.line_total
            producers_dict[p_id]['items'].append({
                'product_id': item.product.id,
                'product_name': item.product.name,
                'quantity': item.quantity,
                'unit_price': item.product.price,
                'line_total': line_total,
            })

            producers_dict[p_id]['producer_subtotal'] += line_total
            grand_total += line_total
            item_count += item.quantity

            # Dynamically calculate food miles from customer to producer postcode.
            # If either postcode is missing or the API fails, fall back to the stored value.
            if p_id not in producer_distances:
                producer_postcode = getattr(producer, 'postcode', None)
                dynamic = calculate_food_miles(customer_postcode, producer_postcode)
                producer_distances[p_id] = dynamic  # May be None if calculation failed

            distance = producer_distances[p_id]
            if distance is not None:
                # Use the real calculated distance
                food_miles_total += distance * item.quantity
            elif item.product.food_miles:
                # Fall back to the stored estimate on the product
                food_miles_total += item.product.food_miles * item.quantity

        # Create sorted list of producers by producer_id
        producers_list = [producers_dict[pid] for pid in sorted(producers_dict.keys())]

        return {
            'cart_id': cart.id,
            'item_count': item_count,
            'grand_total': grand_total,
            'food_miles_total': food_miles_total,
            'producers': producers_list
        }