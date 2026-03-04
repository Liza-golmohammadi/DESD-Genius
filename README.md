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
