# Changes Summary

## Backend: Payments and Settlements

**Affected files:**

- `backend/payments/views.py`
- `backend/payments/services.py`
- `backend/orders/views.py`

### Before

- Payment and settlement endpoints were too open because most views only required users to be logged in.
- Any authenticated user could potentially access payment/settlement data or update payment/settlement status.
- Checkout created an order but did not properly connect the order to payment creation.
- Settlement records for producer payouts were not automatically created during checkout.

### Changed

- Added role-based payment access:
  - Admins can view all payments.
  - Customers can only view payments for their own orders.
  - Producers cannot access general payment records.
- Added role-based settlement access:
  - Admins can view all settlements.
  - Producers can only view their own settlements.
  - Customers are blocked from settlement data.
- Restricted payment status updates to admins only.
- Restricted settlement status updates to admins only.
- Connected checkout to `PaymentService.initiate_payment(order)`.
- Payment service now creates:
  - one order-level payment record,
  - one settlement record per producer sub-order.
- Settlement creation now records:
  - producer subtotal,
  - 5% platform commission,
  - 95% producer payout,
  - settlement status.

---

## Backend: Orders

**Affected files:**

- `backend/orders/services.py`
- `backend/orders/serializers.py`

### Before

- Producer sub-orders could be updated, but the parent customer-facing order status did not update.
- Customer "My Orders" could show pending even when the producer-side order was already delivered.
- Producer order responses did not include enough customer/order information.
- Delivery date handling only accepted producer IDs in one format, causing test failures when producer IDs were passed as integers.
- Reorder unavailable reasons were too broad after adding stricter orderability checks.

### Changed

- Added parent order status syncing after producer sub-order status updates.
- Customer order list now correctly reflects updated producer order statuses such as confirmed, ready, delivered, or cancelled.
- Existing orders were synced once through Django shell so old pending statuses now match producer-order statuses.
- Improved producer order serializer to include:
  - order number,
  - customer name,
  - customer email,
  - customer phone,
  - delivery address,
  - order creation date,
  - producer name,
  - order items,
  - subtotal,
  - producer payout,
  - delivery date,
  - status display.
- Updated delivery date lookup so checkout accepts producer IDs as either strings or integers.
- Added stronger orderability validation during order creation.
- Updated reorder logic so:
  - unavailable/out-of-stock products return `out_of_stock`,
  - products with stock but invalid availability/seasonal state return `not_orderable`.

---

## Backend: Cart

**Affected files:**

- `backend/cart/views.py`

### Before

- Cart endpoints only required authentication.
- Producers/admins accessing cart routes could trigger unclear errors because the cart service expected a customer user.

### Changed

- Added explicit customer-only checks to cart views.
- Producers and admins now receive a clean `403 Forbidden` response if they try to use cart endpoints.
- Applied customer-only validation to:
  - view cart,
  - clear cart,
  - add item,
  - update item quantity,
  - remove item.

---

## Backend: Accounts and Registration

**Affected files:**

- `backend/accounts/serializers.py`
- `backend/accounts/apps.py`
- `backend/accounts/signals.py`

### Before

- Customer registration did not accept all required contact/delivery fields.
- Producer registration did not accept all business/contact fields.
- Producer profile auto-creation was checked but not changed.

### Changed

- Customer registration now accepts:
  - phone,
  - phone number,
  - address,
  - postcode,
  - delivery address.
- Producer registration now accepts:
  - phone,
  - phone number,
  - address,
  - postcode,
  - store name,
  - store description,
  - store contact,
  - store address.
- Phone and phone number fields are kept consistent if only one is provided.
- Confirmed producer profile signal is already working: new producer users automatically get a `ProducerProfile`.
- No code change was needed for `apps.py` or `signals.py`; they were reviewed and confirmed correct.

---

## Backend: Products

**Affected files:**

- `backend/products/models.py`
- `backend/products/views.py`
- `backend/products/serializers.py`
- `backend/products/migrations/0004_alter_product_harvest_date.py`

### Before

- Producers could create products but had limited product editing support.
- The existing inventory endpoint only allowed stock/availability fields to be updated.
- `harvest_date` was required with no default, causing product creation errors in tests.
- Products created without a category caused database errors.
- Product visibility depended on stock, availability, and seasonal date range, but this caused confusion during testing when old availability dates hid restocked products.

### Changed

- Added full product edit support through the product detail endpoint.
- Producers can now edit their own product details, including:
  - name,
  - description,
  - price,
  - unit,
  - image/image URL,
  - stock quantity,
  - low stock threshold,
  - availability,
  - available-from / available-to dates,
  - allergens,
  - organic certification,
  - harvest date,
  - category,
  - farm origin,
  - food miles.
- Ownership checks ensure producers can only edit their own products.
- Added default `harvest_date` using the current local date.
- Created and applied migration: `backend/products/migrations/0004_alter_product_harvest_date.py`
- Added default category fallback: if a product is created without a category, it is assigned to **Uncategorised**.
- Confirmed product visibility behaviour:
  - products with stock and valid dates appear to customers,
  - products with stock 0 disappear from the customer homepage,
  - restocked products reappear if availability dates are valid.

---

## Frontend: Authentication and Route Protection

**Affected files:**

- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`

### Before

- Frontend protected routing did not reliably check all user roles.
- TypeScript did not recognise `user.role`.
- Registration payload types did not match the updated backend registration fields.
- React DOM TypeScript definitions were missing.

### Changed

- Updated protected route logic to check allowed roles properly.
- Updated frontend user type to include `role`.
- Updated customer registration payload type to include:
  - phone,
  - phone number,
  - address,
  - postcode,
  - delivery address.
- Updated producer registration payload type to include:
  - phone,
  - phone number,
  - address,
  - postcode,
  - store address.
- Installed missing React DOM type package: `@types/react-dom`

---

## Frontend: Homepage / Product Filtering

**Affected files:**

- `frontend/src/pages/Home.tsx`

### Before

- Homepage price filter had a hardcoded max of £20.
- Products above £20 were hidden unless the frontend was edited manually.
- Home page had small TypeScript build issues:
  - unused constant,
  - duplicate `gap` property.

### Changed

- Increased price filter maximum from £20 to a higher range for testing/products above £20.
- Removed unused `GRADE_DOT` constant.
- Fixed duplicate `gap` style property.
- Confirmed homepage loads real backend products, not only fake/static data.

---

## Database / Data Setup

**Affected data:**

- `products_category`
- `orders_order.status`

### Before

- Category dropdown was empty because the database had no product categories.
- This blocked producer product creation because category is required.
- Existing parent orders still had old statuses even after producer sub-orders were updated.

### Changed

- Added default product categories through Django shell:
  - Fruit
  - Vegetables
  - Dairy
  - Bakery
  - Meat
  - Eggs
  - Preserves
  - Drinks
  - Other
- Synced existing parent order statuses with their producer sub-order statuses.
- Existing delivered orders now show correctly in the customer "My Orders" list.

---

## Testing and Verification

**Commands / results verified:**

```bash
python manage.py check
npm run build
docker compose exec backend python manage.py test accounts products cart orders payments recipes
```

### Before

- Frontend build failed due to TypeScript errors.
- Local test run failed because local PostgreSQL was not running.
- Docker test run initially had many backend errors caused by product model defaults and delivery-date handling.
- Full test suite still has optional AI-service test failures.

### Changed / Confirmed

- Django system check passes.
- Frontend production build now passes.
- Core backend test suite passes for:
  - `accounts`
  - `products`
  - `cart`
  - `orders`
  - `payments`
  - `recipes`
- Confirmed working manually:
  - customer registration,
  - producer registration,
  - producer product creation,
  - producer product editing,
  - customer product browsing,
  - cart flow,
  - checkout/payment/order placement,
  - stock quantity protection,
  - product disappears when stock reaches zero,
  - product reappears after restock with valid dates,
  - producer order status update,
  - customer order list status update.