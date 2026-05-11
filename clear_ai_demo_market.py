from django.apps import apps

def try_delete(app_label, model_name):
    try:
        model = apps.get_model(app_label, model_name)
        count = model.objects.count()
        model.objects.all().delete()
        print(f"Deleted {count} row(s) from {app_label}.{model_name}")
    except Exception as e:
        print(f"Skipped {app_label}.{model_name}: {e}")

# Delete demo / transactional data first
for app_label, model_name in [
    ("ai_service", "ProductInteraction"),
    ("cart", "CartItem"),
    ("cart", "Cart"),
    ("payments", "Settlement"),
    ("payments", "Payment"),
    ("orders", "ProducerOrderItem"),
    ("orders", "OrderItem"),
    ("orders", "ProducerOrder"),
    ("orders", "Order"),
    ("reviews", "Review"),
]:
    try_delete(app_label, model_name)

# Then clear market data
for app_label, model_name in [
    ("products", "Product"),
    ("products", "Category"),
]:
    try_delete(app_label, model_name)

print("AI demo cleanup complete.")
