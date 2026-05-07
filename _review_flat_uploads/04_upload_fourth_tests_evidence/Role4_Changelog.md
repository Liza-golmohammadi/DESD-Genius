# Member 4 — Sprint 2 Changelog
 
**Author:** Member 4 (Admin, Reporting & Sustainability)
**Date:** 24 March 2026
**Branch:** *Admin-Sustainability*
 
---
 
## Summary of Changes
 
| Area | What was done | Files touched |
|------|--------------|---------------|
| Admin API endpoints | Created `/api/admin/users/` and `/api/admin/orders/` | `orders/views.py`, `backend/urls.py` |
| Admin Dashboard (FE) | Replaced hard-coded stats with live data, added tabbed UI with Users and Orders subpages | `AdminDashboard.tsx` (rewritten), `AdminUsers.tsx` (new), `AdminOrders.tsx` (new) |
| Sustainability backend | Added `farm_origin`, `food_miles` to Product; `farm_story` to Producer; `food_miles_total` to cart summary | `products/models.py`, `accounts/models.py`, `cart/services.py`, `cart/serializers.py`, + serializers |
| Recipe system | Created entire `recipes` app (model, views, serializers, URLs, admin) | `recipes/` (new app), `backend/settings.py`, `backend/urls.py` |
| Sustainability page (FE) | Built `/sustainability` page with live stats, food miles table, traceability section, recipes | `Sustainability.tsx` (new) |
| User account page (FE) | Added delivery address management and order history link | `User.tsx` (rewritten) |
| Producer payments (FE) | Added Payments tab to producer dashboard | `ProducerDashboard.tsx` (modified) |
| Routing & navbar | Fixed sustainability link, added admin navbar link, protected admin route, cleaned up duplicate routes | `App.tsx` (rewritten) |
| Permissions | Created `IsAdmin` permission class | `accounts/permissions.py` (new) |
| User model fix | Added missing `phone`, `address`, `postcode`, `delivery_address`, `terms_accepted` fields to User model (fields existed in DB from migration but were missing from model code) | `accounts/models.py` |
| Serializer updates | Exposed address fields in UserSerializer, `farm_story` in ProducerSerializer, `farm_origin`/`food_miles` in product serializers | `accounts/serializers.py`, `products/serializers.py` |
| Seed data | Added 10 product categories | Database only (no file change) |
| Bug fix | Fixed missing `/api/` prefix on 6 API calls in ProducerDashboard | `ProducerDashboard.tsx` |
| Bug fix | Restored accidentally deleted Store Profile tab in ProducerDashboard | `ProducerDashboard.tsx` |
 
---
 
## Potential Merge Conflicts
 
> **Read this section carefully before merging. These are the files most likely to conflict with other members' work.**
 
### High risk — multiple members edit these files
 
| File | Why it conflicts | How to resolve |
|------|-----------------|----------------|
| `backend/backend/urls.py` | I added 3 URL paths (`admin/users/`, `admin/orders/`, `api/recipes/`). Other members may also add URLs here. | Add my new lines alongside theirs. Order doesn't matter. |
| `backend/backend/settings.py` | I added `'recipes'` to `INSTALLED_APPS`. Others may add apps too. | Just make sure `'recipes'` appears in the list. |
| `frontend/src/App.tsx` | I rewrote this file to fix duplicate routes and add `/admin` + `/sustainability` routes. **Member 1 also owns this file.** | Use my version as the base and add any new routes Member 1/2/3 have created. The critical thing is: `path="*"` catch-all must be the **very last** route. |
| `frontend/src/pages/ProducerDashboard.tsx` | I added a Payments tab, restored the Profile tab, and fixed 6 API paths (`/products/` → `/api/products/` etc). **This file may also be edited by Member 3** for surplus controls. | Keep my Payments tab block and the `/api/` prefix fixes. Member 3's changes will be in the ProductModal section — those shouldn't conflict. |
| `backend/accounts/models.py` | I added `farm_story` to Producer and added 5 missing fields to User (`phone`, `address`, `postcode`, `delivery_address`, `terms_accepted`). **Member 1 also owns this file.** | Member 1 created the migration for those User fields but didn't update the model code. My version has both. Use mine. |
| `backend/accounts/serializers.py` | I added `"address"`, `"postcode"`, `"phone"`, `"delivery_address"` to UserSerializer and `"farm_story"` to ProducerSerializer. | Merge both field lists. |
| `backend/products/models.py` | I added `farm_origin` and `food_miles` to Product. **Member 3 may also add fields** (surplus, best_before_date). | Add all fields — they're independent. Run `makemigrations` after merge. |
| `backend/products/serializers.py` | I added `"farm_origin"` and `"food_miles"` to all 3 serializers. **Member 3 may add surplus fields.** | Add all new field names to the `fields` lists. |
 
### Low risk — I own these files
 
| File | Notes |
|------|-------|
| `accounts/permissions.py` | New file. No conflict unless Member 1 also creates this. If so, merge the permission classes into one file. |
| `AdminDashboard.tsx` | Fully rewritten. I own this file per the checklist. |
| `AdminUsers.tsx` | New file. No conflict. |
| `AdminOrders.tsx` | New file. No conflict. |
| `Sustainability.tsx` | New file. No conflict. |
| `User.tsx` | Rewritten. I own this file per the checklist. |
| `recipes/` (entire app) | New app. No conflict. |
| `cart/services.py` | I added `food_miles_total` calculation (3 small additions). **Member 2 owns the cart app** but this is a read-only addition. |
| `cart/serializers.py` | I added one field (`food_miles_total`) to `CartSummarySerializer`. |
 
---
 
## Migration Notes
 
After merging all members' work, run:
 
```bash
python manage.py makemigrations accounts products recipes
python manage.py migrate
```
 
My migrations:
- `accounts/migrations/0002_producer_farm_story.py` — adds `farm_story` to Producer
- `products/migrations/0002_product_farm_origin_product_food_miles.py` — adds `farm_origin` and `food_miles` to Product
- `recipes/migrations/0001_initial.py` — creates Recipe model
 
If migration numbering conflicts (e.g. Member 3 also created `products/migrations/0002_...`), delete both numbered migrations and re-run `makemigrations` after merge. Django will auto-detect the combined changes.
 
---
 
## Functionality Verification (What I Tested)
 
### Admin Dashboard
-  `/api/admin/users/` returns all users with role, email, name, date joined
-  `/api/admin/users/?role=producer` filters correctly
-  `/api/admin/orders/` returns all orders with customer name, total, commission, status
-  `/api/admin/orders/?status=pending` filters correctly
-  `/api/admin/reports/` returns user summary, order summary, financial summary, recent orders
-  All 3 endpoints reject non-admin users with 403
-  AdminDashboard Overview tab shows real data from reports API
-  AdminDashboard Users tab shows filterable user table with role badges
-  AdminDashboard Orders tab shows filterable orders table with status/date filters
-  Admin Panel navbar link appears only for admin users
-  `/admin` route is protected — non-admin users are redirected
 
### Sustainability
-  `farm_origin` and `food_miles` fields exist on Product model and appear in API responses
-  `farm_story` field exists on Producer model and appears in API responses
-  `food_miles_total` is calculated in cart summary response
-  Recipe model, API (list + detail + create + filter by producer) all working
-  `/sustainability` page loads with live product data, food miles section, traceability cards
-  Sustainability page shows product table with origin, harvest date, organic badge
-  Sustainability page shows recipes when they exist in the database
-  Navbar "Sustainability" link correctly points to `/sustainability` (was `/user` before)
 
### User Account Page
-  User.tsx shows email, role, active status, name
-  Edit profile (name change) works and saves
-  Delivery Address section displays current address or "Not set"
-  Edit address saves street, postcode, and delivery address via PATCH
-  "My Orders" section with link appears for customer role only
 
### Producer Dashboard
-  Payments tab shows Total Earnings, Commission (5%), Net Payout summary cards
-  Payments tab shows per-order breakdown table
-  Store Profile tab displays and edits correctly
-  Categories load in Add Product dropdown (10 seeded categories)
-  All API calls use correct `/api/` prefix
 
### Other
-  Producer and customer registration works with address/phone/postcode fields
-  Products created by producers appear on Sustainability page
-  `IsAdmin` permission class created and functional
 
---
 
## Test Cases Covered by My Role
 
These are the test cases from the project spec that my work directly supports. We have **not yet run formal test case validation** — that will happen after all members merge. This section maps my deliverables to the relevant test cases so the team knows what to test.
 
### Directly covered
 
| Test Case | Title | My Contribution |
|-----------|-------|-----------------|
| TC-001 | Producer registration | Fixed User model so registration saves address/phone/postcode/terms_accepted |
| TC-002 | Customer registration | Same User model fix — all required fields now persist |
| TC-012 | Producer payment settlements | Payments tab in ProducerDashboard shows earnings, 5% commission deduction, net payout, per-order breakdown |
| TC-013 | Food miles display | `farm_origin` + `food_miles` on Product model, `food_miles_total` in cart summary, Sustainability page with food miles table and stats |
| TC-020 | Recipes & farm stories | Recipe model + full CRUD API, `farm_story` field on Producer, recipes displayed on Sustainability page |
| TC-021 | Order history access | "My Orders" link from User.tsx connects account page to order history |
| TC-022 | Secure authentication | `IsAdmin` permission class, admin API endpoints reject non-admins, admin route protected in frontend |
| TC-025 | Admin commission reports | Admin reports API returns revenue, commission, payouts; AdminDashboard displays all financial data; AdminOrders shows commission per order |
 
### Partially covered (depends on other members)
 
| Test Case | What's missing | Who provides it |
|-----------|---------------|-----------------|
| TC-012 | Actual order data needed for real payment figures | Member 2 (checkout flow) |
| TC-013 | Products need `food_miles` values set by producers; food miles in cart needs the cart to have items | Member 3 (product form), Member 2 (cart) |
| TC-020 | No UI for producers to create recipes from dashboard (backend API exists) | Could be added in Sprint 3 |
| TC-021 | Actual order history page content | Member 2 (Orders.tsx) |
| TC-025 | Commission report downloadable as CSV/PDF | Could be added in Sprint 3 |
 
---
 
## Detailed File-by-File Breakdown
 
### New files created
 
#### `backend/accounts/permissions.py`
Defines `IsAdmin` permission class. Returns `True` only if `request.user.role == "admin"`. Used by admin API endpoints. Note: Member 1's checklist includes creating this file — if they also create it, merge the classes together.
 
#### `backend/recipes/` (entire app)
Full Django app with:
- `models.py` — `Recipe` model with `title`, `description`, `ingredients`, `producer` (FK to User)
- `serializers.py` — `RecipeSerializer` with `producer_name` computed field
- `views.py` — `RecipeListCreateView` (GET list + POST create, filterable by `?producer_id=X`) and `RecipeDetailView` (GET single)
- `urls.py` — `api/recipes/` and `api/recipes/<id>/`
- `admin.py` — registered in Django admin
- `apps.py`, `tests.py`, `__init__.py`, `migrations/__init__.py` — standard boilerplate
 
#### `frontend/src/pages/AdminUsers.tsx`
Table of all registered users fetched from `/api/admin/users/`. Features: role filter buttons (All/Customers/Producers/Admins), coloured role badges, sorted by date joined descending.
 
#### `frontend/src/pages/AdminOrders.tsx`
Table of all orders fetched from `/api/admin/orders/`. Features: status dropdown filter, date range filters (from/to), clear filters button, coloured status badges, commission column.
 
#### `frontend/src/pages/Sustainability.tsx`
Public page at `/sustainability`. Sections: hero banner with platform mission, stats cards (products listed, organic count, Bristol-local count, avg food miles), Understanding Food Miles with product distance table, Traceability & Transparency with 3 info cards, "Our Products at a Glance" full product table, Recipes section (shown when recipes exist). All data is live from `/api/products/` and `/api/recipes/`.
 
### Rewritten files
 
#### `frontend/src/pages/AdminDashboard.tsx`
Completely replaced. Old version had hard-coded fake stats. New version: fetches from `/api/admin/reports/` on mount, displays stat cards (Total Users, Total Producers, Total Orders, Total Revenue, Platform Commission, Producer Payouts), Orders by Status breakdown with coloured badges, Recent Orders list, User Breakdown section. Tabbed UI with Overview/Users/Orders — Users and Orders tabs render `AdminUsers` and `AdminOrders` components.
 
#### `frontend/src/pages/User.tsx`
Extended with: `UserProfile` type expanded to include `address`, `postcode`, `phone`, `delivery_address`. New "Delivery Address" section with view/edit toggle, saves via `PATCH /accounts/auth/user/`. New "My Orders" section (customer only) with green button linking to `/orders`.
 
#### `frontend/src/App.tsx`
Cleaned up completely. Removed all duplicate route definitions (signup, login, logout, user, producer/dashboard, orders were all defined twice). Added: `import Sustainability`, `/sustainability` route, admin route wrapped in `<ProtectedRoute allowedRoles={["admin"]} />`, admin navbar link for admin users, "My Orders" navbar link for customers. Moved `path="*"` catch-all to the very last position.
 
### Modified files
 
#### `backend/orders/views.py`
Added `AdminUsersView` and `AdminOrdersView` classes at the bottom. Both check `request.user.role != "admin"` and return 403 for non-admins. `AdminUsersView` supports `?role=` filter. `AdminOrdersView` supports `?status=`, `?date_from=`, `?date_to=` filters.
 
#### `backend/backend/urls.py`
Added 3 imports (`AdminUsersView`, `AdminOrdersView` from orders.views) and 3 URL paths: `api/admin/users/`, `api/admin/orders/`, `api/recipes/`.
 
#### `backend/backend/settings.py`
Added `'recipes'` to `INSTALLED_APPS`.
 
#### `backend/accounts/models.py`
- **User class:** Added `phone`, `address`, `postcode`, `delivery_address`, `terms_accepted` fields. These were missing from the model code despite existing in the database (Member 1 created the migration but didn't update the Python model).
- **Producer class:** Added `farm_story` field (TextField, blank, default empty).
 
#### `backend/accounts/serializers.py`
- **UserSerializer:** Added `"address"`, `"postcode"`, `"phone"`, `"delivery_address"` to `fields`.
- **ProducerSerializer:** Added `"farm_story"` to `fields`.
 
#### `backend/products/models.py`
Added to Product class after `harvest_date`:
- `farm_origin = CharField(max_length=255, blank=True, default="")`
- `food_miles = DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)`
 
#### `backend/products/serializers.py`
Added `"farm_origin"` and `"food_miles"` to the `fields` list in `ProductListSerializer`, `ProductDetailSerializer`, and `ProductCreateSerializer`.
 
#### `backend/cart/services.py`
Added `food_miles_total` tracking to `get_cart_summary()`: initialises `food_miles_total = Decimal('0.00')`, accumulates `product.food_miles * quantity` per item, includes `food_miles_total` in the return dict.
 
#### `backend/cart/serializers.py`
Added `food_miles_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)` to `CartSummarySerializer`.
 
#### `frontend/src/pages/ProducerDashboard.tsx`
- Added `"payments"` to tab type union and tab bar array
- Added Payments tab content: 3 summary cards (Total Earnings, Commission 5%, Net Payout) + per-order breakdown table
- Updated tab label logic to show "Payments" for payments tab
- Fixed 6 API paths missing `/api/` prefix: `/products/` → `/api/products/`, `/products/categories/` → `/api/products/categories/`, `/orders/producer/` → `/api/orders/producer/`, etc.
- Restored accidentally deleted Store Profile tab