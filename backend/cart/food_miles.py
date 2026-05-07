import math
import requests
from decimal import Decimal


def get_postcode_coords(postcode):
    """
    Calls the free postcodes.io API to get latitude and longitude for a UK postcode.
    Returns (lat, lon) tuple or None if the postcode is invalid/not found.
    """
    try:
        # Clean up the postcode — remove spaces and uppercase it
        clean = postcode.strip().replace(" ", "").upper()
        response = requests.get(
            f"https://api.postcodes.io/postcodes/{clean}",
            timeout=5,  # Don't hang if the API is slow
        )
        if response.status_code == 200:
            data = response.json()
            return data["result"]["latitude"], data["result"]["longitude"]
    except Exception:
        pass  # If anything goes wrong, fall back to stored value
    return None


def haversine_miles(lat1, lon1, lat2, lon2):
    """
    Calculates the straight-line distance between two lat/lon points using
    the Haversine formula. Returns distance in miles.
    """
    R = 3959  # Earth's radius in miles

    # Convert degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


def calculate_food_miles(customer_postcode, producer_postcode):
    """
    Calculates the distance in miles between a customer and producer using their postcodes.
    Returns a Decimal distance or None if either postcode can't be resolved.
    """
    if not customer_postcode or not producer_postcode:
        return None

    customer_coords = get_postcode_coords(customer_postcode)
    producer_coords = get_postcode_coords(producer_postcode)

    if not customer_coords or not producer_coords:
        return None

    distance = haversine_miles(
        customer_coords[0], customer_coords[1],
        producer_coords[0], producer_coords[1],
    )

    return Decimal(str(round(distance, 2)))
