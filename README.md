## Changes (Change 4 - Sprint)


#### Test Cases Passed

- `TC-001` Producer registration + login (create producer account, can log in, producer permissions assigned)
- `TC-002` Customer registration + login (create customer account, can log in, customer permissions assigned) 
- `TC-022` Security (Authentication + Authorisation)

- `TC-009` - Partially: Producer can access producer dashboard area

#### Producers browsing (customer-facing)
- Added a **Producers list page** that fetches and displays producers from:
  - `GET /api/producers/`
- Added **Producer detail page routing** so users can click a producer name and navigate to:
  - `/producers/:id` (uses `GET /api/producers/<id>/`)
- Added empty/loading/error states so the page is stable during demos.

#### Producer self-management (producer-only)
- Implemented **Producer “Me” dashboard** for producers to view and update their own business profile via:
  - `GET /api/producer/me/`
  - `PATCH /api/producer/me/`
- Producers can edit:
  - `store_name`
  - `description`
  - `contact_info` (free text field controlled by the producer)

#### User profile management (all logged-in users)
- Implemented **User profile edit** page using:
  - `GET /api/auth/user/`
  - `PATCH /api/auth/user/`
- Users can update:
  - `first_name`
  - `last_name`
  - password (with **confirm password** field to prevent mistakes)
- Added success/error messaging and safe edit/cancel behaviour.

---

### Backend Security / Correctness Improvements
- Ensured **password changes are hashed correctly** on update (so users can log in after changing password).
- Added DB support for producer-related data:
  - Migration to ensure producer table exists (for existing DBs)
  - Added `contact_info` field to Producer model (persisted + editable)

---

### Files Added
- `frontend/src/pages/Producers.tsx`
- `frontend/src/pages/ProducerDetail.tsx`
- `frontend/src/pages/ProducerDashboard.tsx` (expanded from placeholder into real “me” editor)
- `backend/api/migrations/0002_create_producer_table.py` (DB repair for missing Producer table)

---

### Files Modified
- `frontend/src/App.tsx` (routes added for `/producers` and `/producers/:id`)
- `frontend/src/pages/User.tsx` (profile edit + password confirm)
- `frontend/src/api.ts` (token handling / refresh reliability improvements)
- `backend/api/serializers.py` (hash password on update; expose producer fields)
- `backend/api/models.py` (Producer contact_info field)
- `docker-compose.yaml` (frontend API connectivity via `VITE_API_URL`)





## Changes (Producers Feature - Change 3)

### Features
- Implemented **Producers list page** that fetches and displays all producers from the backend.
- Implemented **Producer detail page** with route parameter (`:id`) that fetches and displays a single producer’s details.
- Added clickable producer entries to navigate from list → detail.

### Backend Integration
- Integrated with new backend endpoints:
  - `GET /api/producers/` (list producers)
  - `GET /api/producers/<id>/` (producer detail)

### Navigation / Routing
- Added new routes:
  - `/producers`
  - `/producers/:id`

### UX
- Added loading and error states for producer list + producer detail views.
- Clean, minimal card layout consistent with existing theme.

### Files touched
- `backend/api/migrations/0002_create_producer_table.py` (new; creates missing Producer table for existing DBs)
- `frontend/src/App.tsx` (added routes + imports)
- `frontend/src/pages/Producers.tsx` (new)
- `frontend/src/pages/ProducerDetail.tsx` (new)




## Changes (Auth Frontend - Change 2)

### Docker
- Updated `docker-compose.yaml` so the **Docker-run frontend can reach the backend API** by setting `VITE_API_URL` via compose environment.
- Verified **one-command Docker run** works (backend + frontend containers start successfully; backend runs migrations on startup; Vite runs on `5173`, backend on `8000`).

### Security
- Fixed auth flow so **login uses the correct backend endpoint** (`POST /api/auth/login/`) instead of the older `/api/token/` flow.
- Resolved Docker/browser API-call issues that caused login/refresh failures (auth requests now hit the backend reliably).

### Files touched
- `docker-compose.yaml` (set VITE_API_URL for Docker-run frontend → backend API connectivity)

- `frontend/.env`
  
- `frontend/src/context/AuthContext.tsx` (login flow updated to use POST /api/auth/login/ instead of /api/token/)

- `frontend/src/api.ts` 





## Changes (Auth Frontend - Change 1)

### UI / UX
- Redesigned **Signup** page with a professional card layout:
  - Clear labels for all fields (including **Password** + **Confirm Password**)
  - Better spacing + responsive two-column layout for name/password fields
  - Inline validation (password match) + required fields
  - Loading state + inline error/success messaging (no browser alerts)
- Redesigned **Login** page with a professional card layout:
  - Clear labels + show/hide password toggle
  - Loading state + inline error messaging (no browser alerts)
  - Redirects after successful login (to `/user` or back to the protected route)
- Updated **Home** page to a simple, clean landing card consistent with the theme and easy to extend later.

### Navigation / Routing
- Updated navbar to match the new theme (pill-style links, active styling).
- Navbar is **auth-aware**:
  - Logged out: shows **Login** + **Sign up**
  - Logged in: shows **User** + **Logout** (optionally shows user email)
- Added route guards:
  - Logged-in users visiting `/login` or `/signup` are redirected to `/user`
  - Logged-out users visiting `/user` are redirected to `/login`

### Backend Compatibility
- Signup role handling:
  - UI still shows `Customer / Producer`
  - Role is **mapped** before sending to backend (tries common variants) to prevent:
    - `role: "Producer" is not a valid choice.`
- Uses existing backend endpoints:
  - `POST /api/auth/register/`
  - `POST /api/auth/login/`
  - `GET /api/auth/user/` (via existing AuthContext)

### Files touched
- `frontend/src/App.tsx` (themed auth-aware navbar + route guards)
- `frontend/src/pages/Signup.tsx` (new signup UI + role mapping + validation)
- `frontend/src/pages/Login.tsx` (new login UI + validation + errors + loading)
- `frontend/src/pages/Home.tsx` (clean landing layout)
- `frontend/src/pages/User.tsx` (improved UX states; no “stuck” feeling)
