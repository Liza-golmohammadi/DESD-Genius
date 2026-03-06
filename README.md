# Bristol Regional Food Network

A full-stack web platform connecting local food producers in the Bristol region with customers. Producers can list and manage their products; customers can browse, add items to a cart, and place orders split across multiple producers. The system enforces role-based access control throughout, with separate workflows for customers, producers, and administrators.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Prerequisites](#5-prerequisites)
6. [Backend Setup](#6-backend-setup)
7. [Frontend Setup](#7-frontend-setup)
8. [Running the Application](#8-running-the-application)
9. [Environment Variables](#9-environment-variables)
10. [API Reference](#10-api-reference)
11. [Authentication](#11-authentication)
12. [Running Tests](#12-running-tests)
13. [Data Model Summary](#13-data-model-summary)
14. [Known Limitations](#14-known-limitations)

---

## 1. Project Overview

The Bristol Regional Food Network platform addresses the challenge of connecting small-scale regional food producers with local consumers. It provides:

- **Customer-facing marketplace** — browse products by category, filter by producer or organic certification, search, and add items to a persistent cart.
- **Checkout and order management** — customers submit a delivery address and preferred delivery date per producer; the system splits a single checkout into per-producer sub-orders.
- **Producer dashboard** — producers manage their product listings, update inventory and availability windows, and track incoming orders through a defined status lifecycle.
- **Role-based access control** — three roles (`customer`, `producer`, `admin`) with distinct permissions enforced at the API level.

---

## 2. Architecture

The application follows a decoupled client–server architecture:

```
┌─────────────────────────┐        HTTP / JSON        ┌──────────────────────────┐
│   React Frontend        │  ◄──────────────────────► │   Django REST Backend    │
│   Vite + TypeScript     │        JWT Bearer          │   Django 6 + DRF         │
│   React Router v7       │                            │   SQLite (dev)           │
└─────────────────────────┘                            └──────────────────────────┘
```

The frontend is a single-page application (SPA) that communicates exclusively with the backend REST API. All authentication is handled via JSON Web Tokens (JWT); no session cookies are used. The frontend stores tokens in `localStorage` and attaches them to requests via an Axios interceptor, automatically refreshing the access token when it expires.

The backend is structured as four discrete Django applications, each responsible for a distinct bounded context:

| App | Responsibility |
|---|---|
| `accounts` | Custom user model, registration, login, producer profile management |
| `products` | Product and category models, product CRUD, inventory management |
| `cart` | Per-customer persistent cart, item management |
| `orders` | Checkout service, order splitting by producer, status lifecycle |

---

## 3. Technology Stack

### Backend
| Component | Version |
|---|---|
| Python | 3.10+ |
| Django | 6.0 |
| Django REST Framework | 3.x |
| djangorestframework-simplejwt | 5.x |
| django-cors-headers | 4.x |
| SQLite | (development database) |

### Frontend
| Component | Version |
|---|---|
| React | 19 |
| TypeScript | 5.9 |
| Vite | 7 |
| React Router | 7 |
| Axios | 1.x |

---

## 4. Repository Structure

```
.
├── backend/
│   ├── accounts/           # User model, auth views, producer profile
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── products/           # Product + category models and API
│   ├── cart/               # Cart model and service layer
│   ├── orders/             # Order creation, splitting, status updates
│   ├── backend/
│   │   ├── settings.py
│   │   └── urls.py         # Root URL configuration
│   ├── manage.py
│   └── db.sqlite3          # Development database (not committed)
│
└── frontend/
    ├── src/
    │   ├── api.ts                    # Axios instance + JWT interceptors
    │   ├── App.tsx                   # Routes and layout
    │   ├── context/                  # Auth context (AuthContext + useAuth)
    │   ├── components/               # ProtectedRoute
    │   ├── data/
    │   │   └── fakeProducts.ts       # Static product dataset for UI development
    │   └── pages/
    │       ├── Home.tsx              # Marketplace browse page
    │       ├── Login.tsx
    │       ├── Signup.tsx
    │       ├── User.tsx              # Customer profile
    │       ├── Orders.tsx            # Customer order history
    │       ├── Producers.tsx         # Producer directory
    │       ├── ProducerDetail.tsx
    │       └── ProducerDashboard.tsx # Producer management dashboard
    ├── package.json
    └── vite.config.ts
```

---

## 5. Prerequisites

- Python 3.10 or later
- Node.js 18 or later and npm
- Git

---

## 6. Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers python-dotenv

# 4. Apply database migrations
python manage.py migrate

# 5. (Optional) Create a superuser for the Django admin
python manage.py createsuperuser

# 6. Start the development server
python manage.py runserver
```

The backend will be available at `http://localhost:8000`.

---

## 7. Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create a local environment file
echo "VITE_API_URL=http://localhost:8000" > .env
```

---

## 8. Running the Application

Run both servers simultaneously in separate terminals.

**Terminal 1 — backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

The frontend dev server starts on `http://localhost:5173` (or the next available port if 5173 is occupied).

---

## 9. Environment Variables

### Frontend (`.env` in `frontend/`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the Django backend | `http://localhost:8000` |

### Backend

The backend reads a `DJANGO_SECRET_KEY` environment variable if present. For development, a fallback insecure key is used automatically — this must not be used in production.

---

## 10. API Reference

All endpoints are prefixed with the backend base URL. JWT access tokens must be included in the `Authorization` header as `Bearer <token>` for protected routes.

### Authentication

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| POST | `/accounts/token/` | Obtain access + refresh token pair | No |
| POST | `/accounts/token/refresh/` | Refresh access token | No |
| POST | `/accounts/token/blacklist/` | Invalidate refresh token (logout) | No |

### Accounts

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/accounts/register/` | Register a new user | No |
| GET | `/accounts/user/me/` | Get own user profile | Any |
| PATCH | `/accounts/user/me/` | Update own name or password | Any |
| GET | `/accounts/producer/me/` | Get own producer profile | Producer |
| PATCH | `/accounts/producer/me/` | Update store name, description, contact | Producer |
| GET | `/accounts/producers/` | List all producers | Any |
| GET | `/accounts/producers/<id>/` | Get a single producer | Any |

### Products

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/products/categories/` | List all categories | Any |
| GET | `/api/products/` | List products (filtered by role) | Any |
| POST | `/api/products/` | Create a product | Producer |
| GET | `/api/products/<id>/` | Get product detail | Any / Owner |
| PATCH | `/api/products/<id>/inventory/` | Update stock, availability, season dates | Producer (owner) |

Producers see their own unavailable products in the listing; public users only see products that are available, in stock, and within their season window.

### Cart

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/cart/` | View cart contents | Customer |
| POST | `/api/cart/items/` | Add item to cart | Customer |
| PATCH | `/api/cart/items/<id>/` | Update item quantity | Customer |
| DELETE | `/api/cart/items/<id>/` | Remove item from cart | Customer |
| DELETE | `/api/cart/` | Clear entire cart | Customer |

### Orders

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/api/orders/checkout/` | Create order from cart | Customer |
| GET | `/api/orders/` | List own orders | Customer |
| GET | `/api/orders/<order_number>/` | Get order detail | Customer / Producer |
| POST | `/api/orders/<order_number>/reorder/` | Add previous order items to cart | Customer |
| GET | `/api/orders/producer/` | List sub-orders assigned to producer | Producer |
| PATCH | `/api/orders/producer/<id>/status/` | Update sub-order status | Producer |

---

## 11. Authentication

The system uses stateless JWT authentication with a short-lived access token and a longer-lived refresh token:

- **Access token lifetime:** 60 minutes
- **Refresh token lifetime:** 7 days

The frontend Axios instance (`src/api.ts`) intercepts 401 responses, attempts a token refresh automatically, and retries the original request. If the refresh fails the user is redirected to the login page.

The `USERNAME_FIELD` on the custom user model is set to `email`, so all logins are email-based. Passwords are validated against Django's built-in validators (minimum length, common password list, numeric-only check).

---

## 12. Running Tests

The backend test suite covers authentication, product browsing rules, cart operations, and order creation and status transitions. All 37 tests pass on a clean database.

```bash
cd backend
python manage.py test
```

Coverage areas:

- **Accounts** — registration, login, role assignment, producer profile access control
- **Products** — public visibility rules (availability, stock, season window), category and search filters, organic filter, producer-only create and inventory update, validation of negative stock and invalid season ranges
- **Cart** — add, update, remove, clear, per-customer data isolation
- **Orders** — checkout splits order by producer, stock decrements on placement, commission calculation, status lifecycle transitions, reorder behaviour, minimum order value enforcement

---

## 13. Data Model Summary

```
User (accounts.User)
│  email (unique, login field)
│  role: customer | producer | admin
│  minimum_order_value
│
├── Producer (accounts.Producer)
│      store_name, description, contact_info
│
├── Cart (cart.Cart)               [customer only, one per user]
│   └── CartItem
│          product (FK), quantity
│
├── Order (orders.Order)           [created at checkout]
│   │  order_number, total_amount, commission_amount
│   │  delivery_address, status
│   │
│   └── ProducerOrder              [one per producer within the order]
│       │  subtotal, producer_payout, delivery_date, status, notes
│       └── ProducerOrderItem
│              product (FK), quantity, unit_price
│
Product (products.Product)
│  name, description, price, unit, image_url
│  stock_quantity, low_stock_threshold, is_available
│  available_from, available_to, harvest_date
│  organic_certified, allergens
│  producer (FK → User), category (FK → Category)
│
Category (products.Category)
       name
```

### Order status lifecycle

Each `ProducerOrder` follows this transition graph, enforced by the backend:

```
pending ──► confirmed ──► ready ──► delivered
   └──────────────────► cancelled
```

Transitions outside this graph are rejected with a 400 response.

---

## 14. Known Limitations

**Database:** SQLite is used for development convenience. A production deployment would require replacing this with a server-grade database such as PostgreSQL.

**Media storage:** Product images are stored as URLs only. There is no file upload endpoint; producers must host images externally and provide a direct URL when creating a product.

**Payment integration:** The checkout endpoint creates an order and returns `payment_status: "pending"`. No payment gateway is connected. A `PaymentService` call is marked as a TODO in `orders/views.py`.

**Email activation:** New user accounts are created with `is_active = False`. No activation email is sent in the current implementation; accounts must be activated via the Django admin panel or a direct database update.

**CORS policy:** `CORS_ALLOW_ALL_ORIGINS = True` is set in `settings.py` for development. This must be changed to an explicit allowlist before any public-facing deployment.

**Frontend product data:** The marketplace browse page (`Home.tsx`) uses a static dataset defined in `src/data/fakeProducts.ts` for UI development and demonstration purposes. Wiring this page to the live `/api/products/` endpoint is the intended next step.
