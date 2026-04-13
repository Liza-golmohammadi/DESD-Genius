import urllib.request
import json
import uuid

email = f"prod_{uuid.uuid4().hex[:6]}@test.com"

# Register
reg_data = json.dumps({
    "email": email, 
    "password": "TestPass123!",
    "accepted_terms": True,
    "first_name": "Test",
    "last_name": "Prod",
    "store_name": "Test Store"
}).encode('utf-8')
req0 = urllib.request.Request("http://localhost:8000/api/auth_service/register/producer/", data=reg_data, headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req0)
    print("Registered")
except Exception as e:
    print("Reg failed:", e)

# Login
data = json.dumps({"email": email, "password": "TestPass123!"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/auth_service/token/", data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read())
        token = res['access']
        print("Logged in")
except Exception as e:
    print("Login failed:", e)
    try:
        print(e.read().decode())
    except:
        pass
    token = None

if token:
    req2 = urllib.request.Request("http://localhost:8001/api/products/", data=json.dumps({"name":"A"}).encode('utf-8'), headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req2) as resp2:
            print("Status:", resp2.status)
            print(resp2.read().decode())
    except urllib.error.HTTPError as e:
        print("Product post failed:", e.code)
        print(e.read().decode()[:1000])
