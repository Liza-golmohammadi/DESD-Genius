TOKEN=$(curl -s -X POST http://localhost/api/auth_service/login/ -H "Content-Type: application/json" -d '{"email":"customer1@test.com","password":"TestPass123!"}' | grep -o '"access":"[^"]*' | cut -d '"' -f 4)
echo "Got token: ${TOKEN:0:10}..."

curl -s -v -X POST http://localhost/api/products/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "description": "desc", "price": 10.0, "unit": "kg", "stock_quantity": 100, "low_stock_threshold": 5, "is_available": true}'
