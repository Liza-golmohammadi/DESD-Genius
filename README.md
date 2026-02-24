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
