from django.apps import apps

def safe_delete(app_label, model_name):
    try:
        Model = apps.get_model(app_label, model_name)
        count = Model.objects.count()
        Model.objects.all().delete()
        print(f"Deleted {count} row(s) from {app_label}.{model_name}")
    except Exception as e:
        print(f"Skipped {app_label}.{model_name}: {e}")

print("Clearing product-related demo data...")

# Clear AI/product/order/cart data first so Product deletion does not fail
for app_label, model_name in [
    ("ai_service", "QualityAssessment"),
    ("ai_service", "ProductInteraction"),
    ("ai_service", "RecommendationLog"),
    ("cart", "CartItem"),
    ("cart", "Cart"),
    ("payments", "Settlement"),
    ("payments", "Payment"),
    ("orders", "ProducerOrderItem"),
    ("orders", "OrderItem"),
    ("orders", "ProducerOrder"),
    ("orders", "Order"),
    ("reviews", "Review"),
    ("discounts", "Discount"),
]:
    safe_delete(app_label, model_name)

# Now delete products and categories
for app_label, model_name in [
    ("products", "Product"),
    ("products", "Category"),
]:
    safe_delete(app_label, model_name)

print("Done. All products removed. User accounts are kept.")
