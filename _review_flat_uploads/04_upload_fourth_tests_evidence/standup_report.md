# Progress Update: Role 2 (Commerce Engineer)
**Dami Onasanya (23077441)**

### ✅ Done So Far
- **Multi-Vendor Engine**: Implemented logic to split customer checkouts into per-producer sub-orders.
- **Service Layer**: Decoupled business logic into `CartService` and `OrderService` for better testability.
- **Financial Accuracy**: Used `Decimal` for all money fields; automated 5% commission/95% payout logic and price snapshotting.
- **Concurrency**: Integrated `select_for_update` to prevent stock race conditions during checkout.
- **Security & Scope**: Implemented vendor data isolation and a strict 48-hour delivery lead time.
- **Level-Up Feature**: Built **Producer Minimum Order Values** to block checkouts that don't meet vendor thresholds.
- **Verification**: 23/23 tests passing; documentation updated in `Role2.md`.

### 🚀 Next Steps
- **Integrations**: Connect checkout to **Role 4 (Payments)** and **Role 3 (Notifications)** once their services are live.
- **Discount System**: Add a `Coupon` model and logic for seasonal promo codes.
- **Producer Tools**: Build an automated packing list generator (CSV export) for vendors.
- **Tiered Delivery**: Implement logic for delivery fees based on order totals.
- **Produce Subscriptions**: Conceptualize recurring order logic (TC-018).
