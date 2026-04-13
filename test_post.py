import requests
import json
import sys

# Login first
login_url = "http://localhost:8000/api/auth_service/login/"
res = requests.post(login_url, json={"email": "producer1@test.com", "password": "TestPassword123!"})
if res.status_code == 200:
    token = res.json()["access"]
    print("Token obtained")
else:
    print("Login failed", res.text)
    sys.exit(1)

# Now post to products
post_url = "http://localhost:8001/api/products/"
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
body = {
    "name": "Test product",
    "description": "desc",
    "price": 10.0,
    "unit": "kg",
    "stock_quantity": 100,
    "low_stock_threshold": 5,
    "is_available": True
}
res2 = requests.post(post_url, headers=headers, json=body)
print(res2.status_code)
print(res2.text[:500])
