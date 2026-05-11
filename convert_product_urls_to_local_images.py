from io import BytesIO
from pathlib import Path
import re
import requests
from PIL import Image
from django.core.files.base import ContentFile
from products.models import Product

def safe_filename(name):
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return name.strip("_") + ".jpg"

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}

print("Converting product image_url values into local JPEG ImageField files...")

for product in Product.objects.all().order_by("id"):
    print("\\nProduct:", product.id, product.name)

    if not product.image_url:
        print("SKIP: no image_url")
        continue

    try:
        response = requests.get(
            product.image_url,
            headers=headers,
            timeout=20,
            allow_redirects=True,
        )

        print("URL:", product.image_url)
        print("HTTP status:", response.status_code)
        print("Content-Type:", response.headers.get("content-type"))

        if response.status_code != 200:
            print("FAILED: image URL did not return HTTP 200")
            continue

        # Open the downloaded content using Pillow.
        img = Image.open(BytesIO(response.content))

        # Force convert into normal RGB JPEG.
        img = img.convert("RGB")

        # Optional: resize to a reasonable local display size.
        # The model will still resize again to 224x224 during inference.
        img.thumbnail((1000, 1000))

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        buffer.seek(0)

        filename = safe_filename(product.name)

        product.image.save(
            filename,
            ContentFile(buffer.read()),
            save=True,
        )

        print("SAVED LOCAL IMAGE:", product.image.name)
        print("Local path exists:", product.image.storage.exists(product.image.name))

    except Exception as e:
        print("FAILED:", type(e).__name__, str(e))

print("\\nDone.")
