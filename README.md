# DESD Genius - Bristol Regional Food Network

> A full-stack marketplace platform connecting local food producers with conscious consumers. Features AI-powered quality assessment, personalized recommendations, review system, and dynamic discount management.

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-6.0-darkgreen?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

---

## Key Features

### Marketplace & Commerce
- **Multi-producer checkout** — Single cart split across multiple producers automatically
- **Persistent cart** — Save items between sessions
- **Role-based access** — Customer, Producer, and Admin workflows
- **Stock management** — Real-time inventory with low-stock alerts
- **Seasonal availability** — Products with harvest dates and availability windows

### AI-Powered Quality & Recommendations
- **Automatic quality assessment** — CNN-based image analysis or mock mode
- **Hybrid recommendation engine** — Combines collaborative filtering + quality data
- **Explainable AI (XAI)** — Technical and non-technical explanations for recommendations
- **Fairness monitoring** — Gini coefficient tracking for producer representation
- **Surplus deals** — Automatically discounted items from quality assessments
- **Quick reorder** — AI-suggested products matched to purchase history

### Customer Reviews & Ratings
- **5-star verified reviews** — Only customers with delivered orders can review
- **Review aggregation** — Average ratings and distribution charts per product
- **Duplicate prevention** — One review per product per customer
- **Helpful tracking** — Community feedback on reviews
- **Review admin** — Django admin panel for moderation

### Discount & Coupon System
- **Flexible coupons** — Percentage or fixed amount discounts
- **Usage limits** — Global and per-user limits
- **Minimum order values** — Enforce spending thresholds
- **Validity periods** — Time-based expiration
- **Product discounts** — Automatic discounts from quality grades
- **Admin dashboard** — Coupon creation and performance tracking

### Sustainability & Traceability
- **Food miles tracking** — Distance from farm to customer (optional)
- **Organic certification** — Searchable organic product filter
- **Farm origin** — Producer location and story
- **Storage tips** — Product care instructions
- **Recipe ideas** — Suggested recipes per product

### Privacy & Compliance
- **GDPR-ready** — Data deletion endpoints
- **JWT authentication** — Stateless, token-based auth
- **Role-based access control** — Enforced at API and view level
- **Session management** — Auto-refreshing tokens with 60min lifetime
- **Product interaction logging** — Transparent data collection for ML

---

## Architecture

```
┌─────────────────────────────────────┐
│     React SPA Frontend (Vite)       │
│  - TypeScript + React Router v7     │
│  - JWT authentication (localStorage)│
│  - Real-time cart & recommendations │
└────────────────┬────────────────────┘
                 │ REST API / JSON
                 │ Bearer JWT
                 ▼
┌─────────────────────────────────────┐
│   Django REST Backend               │
│  - Python 3.12 + Django 6.0         │
│  - PostgreSQL database              │
│  - TensorFlow CNN (optional)        │
│  - Scikit-learn collaborative filter│
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   PostgreSQL    │
        │    Database     │
        └─────────────────┘
```

### Backend Modules

| Module | Purpose | Key Models |
|--------|---------|-----------| 
| `accounts` | User management, authentication | User, Producer profile |
| `products` | Product catalog, inventory | Product, Category, ProductDiscount |
| `cart` | Shopping cart management | Cart, CartItem |
| `orders` | Checkout, order splitting, status | Order, ProducerOrder, ProducerOrderItem |
| `ai_service` | Quality assessment, recommendations | QualityAssessment, ProductInteraction, RecommendationLog |
| `reviews` | Customer reviews & ratings | Review |
| `discounts` | Coupons & promotions | Coupon, CouponUse, ProductDiscount |

---

## Tech Stack

### Backend
| Tool | Version | Purpose |
|------|---------|---------| 
| Python | 3.12 | Runtime |
| Django | 6.0.2 | Web framework |
| DRF | 3.16 | REST API |
| SimpleJWT | 5.5 | Authentication |
| PostgreSQL | 16 | Database |
| TensorFlow | 2.13 | CNN quality classifier |
| Scikit-learn | 1.3 | Collaborative filtering |

### Frontend
| Tool | Version | Purpose |
|------|---------|---------| 
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool |
| React Router | 7 | Routing |
| Axios | 1.x | HTTP client |
| Lucide Icons | Latest | UI icons |

---

## Repository Structure

```
DESD-Genius/
├── backend/
│   ├── accounts/              # User model, auth, profiles
│   ├── products/              # Product catalog
│   ├── cart/                  # Shopping cart service
│   ├── orders/                # Order management
│   ├── ai_service/            # Quality + recommendations
│   │   ├── models.py          # QualityAssessment, RecommendationLog
│   │   ├── services/
│   │   │   ├── quality_classifier.py    # CNN wrapper
│   │   │   ├── recommendations.py       # Collaborative filtering
│   │   │   └── xai.py                   # Explanations
│   │   └── views.py           # Assessment & recommendation endpoints
│   ├── reviews/               # Customer reviews
│   ├── discounts/             # Coupons & discounts
│   ├── recipes/               # Recipe suggestions
│   ├── payments/              # Payment processing
│   ├── backend/
│   │   ├── settings.py        # Django config
│   │   └── urls.py            # Route definitions
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api.ts                      # Axios + JWT interceptor
│   │   ├── App.tsx                     # Routes
│   │   ├── context/                    # Auth context
│   │   ├── components/
│   │   │   ├── ReviewsSection.tsx      # Review form & listing
│   │   │   ├── CouponForm.tsx          # Discount code input
│   │   │   └── DiscountBadge.tsx       # Visual discount indicator
│   │   └── pages/
│   │       ├── Home.tsx                # Marketplace
│   │       ├── ProductDetail.tsx       # Product page + reviews
│   │       ├── Checkout.tsx            # Order confirmation + coupons
│   │       ├── RescueMarket.tsx        # AI surplus deals
│   │       └── Login.tsx, Signup.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md (this file)
```

---

## Quick Start

### Prerequisites
- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Git**

### Run Everything

```bash
# Clone the repository
git clone <repo-url>
cd DESD-Genius

# Start all services
docker-compose up -d

# Apply migrations
docker-compose exec backend python manage.py migrate

# Create a superuser (optional, for Django admin)
docker-compose exec backend python manage.py createsuperuser
```

**Access the app:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Django Admin: `http://localhost:8000/admin/`
- Database: PostgreSQL on `localhost:5432`

---

## API Reference

### Authentication
```bash
# Register
POST /accounts/register/
{ "email": "user@example.com", "password": "secure_password", "role": "customer" }

# Login
POST /accounts/token/
{ "username": "user@example.com", "password": "secure_password" }
# Returns: { "access": "token", "refresh": "token" }

# Refresh token
POST /accounts/token/refresh/
{ "refresh": "token" }

# Logout
POST /accounts/token/blacklist/
{ "refresh": "token" }
```

### Products
```bash
# List products (role-filtered)
GET /api/products/?category=fruits&organic=true&search=apple

# Get product details (includes reviews)
GET /api/products/{id}/

# Create product (producer only)
POST /api/products/
{
  "name": "Organic Apples",
  "price": "3.50",
  "stock_quantity": 100,
  "producer": 1,
  "category": 2
}

# Update inventory (producer only)
PATCH /api/products/{id}/inventory/
{ "stock_quantity": 80, "is_available": true }
```

### Cart
```bash
# View cart
GET /api/cart/

# Add item
POST /api/cart/items/
{ "product_id": 1, "quantity": 3 }

# Update quantity
PATCH /api/cart/items/{id}/
{ "quantity": 5 }

# Remove item
DELETE /api/cart/items/{id}/

# Clear cart
DELETE /api/cart/
```

### Orders
```bash
# Create order from cart
POST /api/orders/checkout/
{
  "delivery_address": "123 Main St, Bristol",
  "producer_delivery_dates": { "1": "2026-05-15", "2": "2026-05-16" }
}

# List customer orders
GET /api/orders/

# Get order details
GET /api/orders/{order_number}/

# Reorder from history
POST /api/orders/{order_number}/reorder/

# Producer: List incoming sub-orders
GET /api/orders/producer/

# Producer: Update sub-order status
PATCH /api/orders/producer/{id}/status/
{ "status": "ready", "note": "Ready for pickup" }
```

### AI & Recommendations
```bash
# Get personalized recommendations
GET /api/ai/recommendations/
# Returns: { "recommendations": [...], "surplus_deals": [...], "quick_reorder": [...] }

# Get product quality assessment
GET /api/ai/quality/{product_id}/

# Quality history (producer)
GET /api/ai/quality/history/

# Get XAI explanation for assessment
GET /api/ai/quality/{assessment_id}/explanation/

# Admin insights
GET /api/ai/admin/insights/

# Producer insights
GET /api/ai/producer/insights/
```

### Reviews
```bash
# Get product reviews with stats
GET /api/reviews/product/{product_id}/
# Returns: { "average_rating": 4.5, "total_reviews": 12, "rating_distribution": {...}, "reviews": [...] }

# Submit review (verified purchase only)
POST /api/reviews/reviews/
{
  "product": 1,
  "producer_order_id": 5,
  "rating": 5,
  "title": "Excellent quality!",
  "comment": "Fresh and delicious."
}

# Get my reviews
GET /api/reviews/my-reviews/

# Mark review as helpful
POST /api/reviews/reviews/{id}/mark-helpful/
```

### Discounts & Coupons
```bash
# List active coupons
GET /api/discounts/coupons/

# Validate coupon
POST /api/discounts/coupons/validate/
{ "code": "SAVE10" }

# Apply coupon (get discount)
POST /api/discounts/coupons/apply/
{
  "code": "SAVE10",
  "subtotal": 50.00
}
# Returns: { "coupon_code": "SAVE10", "discount_amount": 5.00, "final_total": 45.00 }

# Coupon usage history
GET /api/discounts/coupons/my-history/

# Product discounts (auto-applied)
GET /api/discounts/product-discounts/active/
```

---

## Authentication Details

**Access Token Lifetime:** 60 minutes  
**Refresh Token Lifetime:** 7 days

The frontend automatically:
1. Stores tokens in `localStorage`
2. Attaches access token to all requests: `Authorization: Bearer <token>`
3. Detects 401 responses and refreshes the token
4. Retries the original request with new token
5. Redirects to login if refresh fails

Login uses **email as username**. All user emails are lowercase and unique.

---

## Testing

Run the test suite:

```bash
# Backend tests
docker-compose exec backend python manage.py test

# Coverage report
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

**Test coverage includes:**
- User authentication (JWT, token refresh)
- Role-based access control
- Product visibility rules (stock, season, organic)
- Cart operations (add, update, remove)
- Order creation and splitting by producer
- Order status transitions
- Stock decrements on checkout
- Review creation (delivered orders only)
- Coupon validation and discount calculations
- AI recommendations and quality assessments

---

## Database Schema

### Key Models

**User (accounts.User)**
```
- email (unique, login field)
- role: customer | producer | admin
- minimum_order_value (for producers)
- is_active, created_at, updated_at
```

**Product (products.Product)**
```
- name, description, price, unit
- image_url, image (file upload)
- stock_quantity, low_stock_threshold
- is_available, available_from, available_to
- harvest_date, farm_origin, food_miles
- organic_certified, allergens, storage_tips
- producer (FK), category (FK)
```

**Order (orders.Order)**
```
- order_number (unique)
- customer (FK)
- total_amount, commission_amount
- delivery_address, status
- created_at, updated_at
```

**ProducerOrder (orders.ProducerOrder)** — One per producer in order
```
- order (FK), producer (FK)
- subtotal, producer_payout
- delivery_date, status, notes
```

**Review (reviews.Review)**
```
- product (FK), customer (FK), producer_order (FK)
- rating (1-5), title, comment
- is_verified_purchase, helpful_count
- unique_together: [product, customer]
```

**Coupon (discounts.Coupon)**
```
- code (unique), description
- discount_type: percentage | fixed
- discount_value, maximum_discount
- minimum_order_value
- max_uses, max_uses_per_user
- is_active, valid_from, valid_until
```

**QualityAssessment (ai_service.QualityAssessment)**
```
- product (FK), producer (FK)
- colour_score, size_score, ripeness_score
- overall_grade (A/B/C), confidence
- discount_percentage, auto_discount_applied
- is_mock (boolean), model_version
```

---

## Important Notes

### Development vs Production

**Development (Docker Compose):**
- SQLite in-memory database (reset on restart)
- `DEBUG = True`
- `CORS_ALLOW_ALL_ORIGINS = True`
- AI runs in mock mode (no TensorFlow required)

**Production Deployment:**
- Replace SQLite with PostgreSQL
- Set `DEBUG = False`
- Configure specific `CORS_ALLOWED_ORIGINS`
- Use environment variables for secrets
- Enable HTTPS, CSRF protection
- Set up real payment gateway integration

### Known Limitations

1. **Email activation** — New accounts need manual admin activation or database update
2. **Payment integration** — Checkout creates orders but doesn't process payments
3. **Media storage** — Images stored as external URLs only (no file upload)
4. **Email notifications** — Order updates don't trigger emails (TODO)
5. **Real-time updates** — WebSocket notifications not implemented

---

## License

This project is built for the Bristol Regional Food Network initiative.

---

## Support & Contributing

For issues, questions, or contributions, please open an issue on GitHub or contact the development team.

**Last Updated:** May 2026  
**Status:** Production-ready with experimental AI features
