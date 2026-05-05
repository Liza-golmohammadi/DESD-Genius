import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import useAuth from "./context/useAuth";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import User from "./pages/User";
import ProtectedRoute from "./components/ProtectedRoute";
import ProducerDashboard from "./pages/ProducerDashboard";
import Orders from "./pages/Orders";
import Producers from "./pages/Producers";
import ProducerDetail from "./pages/ProducerDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Sustainability from "./pages/Sustainability";
import OrderDetail from "./pages/OrderDetail";
import PaymentsPage from "./pages/PaymentsPage";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import RescueMarket from "./pages/RescueMarket";
import ResolutionCenter from "./pages/ResolutionCenter";
import CommunityHub from "./pages/CommunityHub";

function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Navigate to="/login" replace />;
}

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isAuthed = !!localStorage.getItem("access");
  const isProducer = !!user?.producer_profile;

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Responsive breakpoint
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 1080);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchInput.trim())}`);
    setMenuOpen(false);
  }

  /* ── Shared nav links (rendered in row OR dropdown) ── */
  const navLinks = (
    <>
      <NavLink to="/" style={pill} end>Home</NavLink>
      {isAuthed && <NavLink to="/producers" style={pill}>Producers</NavLink>}
      {isAuthed && isProducer && <NavLink to="/producer/dashboard" style={pill}>Dashboard</NavLink>}
      {isAuthed && !isProducer && <NavLink to="/orders" style={pill}>Orders</NavLink>}
      {isAuthed && user?.role === "admin" && <NavLink to="/admin" style={pill}>Admin</NavLink>}
      <NavLink to="/rescue-market" style={pill}>Rescue</NavLink>
      <NavLink to="/sustainability" style={pill}>Sustainability</NavLink>
      <NavLink to="/community" style={pill}>Community</NavLink>
      <NavLink to="/resolution-center" style={pill}>Resolution</NavLink>
    </>
  );

  /* ── Pill style (works for both inline & dropdown) ── */
  function pill({ isActive }: { isActive: boolean }): React.CSSProperties {
    return {
      padding: "7px 13px",
      borderRadius: 8,
      border: isActive ? "1px solid #40916c" : "1px solid transparent",
      textDecoration: "none",
      fontWeight: 600,
      fontSize: 13,
      color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
      background: isActive ? "#2d6a4f" : "transparent",
      transition: "background 0.15s, color 0.15s",
      whiteSpace: "nowrap",
    };
  }

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#1b4332",
          borderBottom: "1px solid #2d6a4f",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 20px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* ── Brand ── */}
          <NavLink
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="#52b788">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1 }}>
                BRISTOL
              </div>
              <div style={{ fontSize: 8, letterSpacing: 1.5, opacity: 0.6, lineHeight: 1, marginTop: 1 }}>
                REGIONAL FOOD NETWORK
              </div>
            </div>
          </NavLink>

          {/* ── Desktop nav links ── */}
          {!isMobile && (
            <nav style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8 }}>
              {navLinks}
            </nav>
          )}

          {/* ── Spacer ── */}
          <div style={{ flex: 1 }} />

          {/* ── Search bar ── */}
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              maxWidth: isMobile ? 180 : 280,
              flex: 1,
            }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              style={{
                flex: 1,
                padding: "7px 12px",
                border: "none",
                borderRadius: "8px 0 0 8px",
                fontSize: 13,
                outline: "none",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              style={{
                padding: "7px 10px",
                border: "none",
                borderRadius: "0 8px 8px 0",
                background: "#40916c",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              &#128269;
            </button>
          </form>

          {/* ── Cart icon (hidden for producers) ── */}
          {!isProducer && (
            <NavLink to="/cart" style={{ display: "flex", flexShrink: 0 }}>
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2}
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </NavLink>
          )}

          {/* ── User email (desktop only) ── */}
          {!isMobile && isAuthed && user?.email && (
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 1,
              }}
            >
              {user.email}
            </span>
          )}

          {/* ── Auth buttons ── */}
          {!isAuthed ? (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <NavLink
                to="/login"
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#fff",
                  background: "transparent",
                }}
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#1b4332",
                  background: "#fff",
                }}
              >
                Sign up
              </NavLink>
            </div>
          ) : (
            <NavLink
              to="/logout"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
                color: "#fff",
                background: "transparent",
                flexShrink: 0,
              }}
            >
              Logout
            </NavLink>
          )}

          {/* ── Hamburger (mobile only) ── */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
                width: 36,
                height: 36,
                background: menuOpen ? "rgba(255,255,255,0.12)" : "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                cursor: "pointer",
                flexShrink: 0,
                padding: 0,
              }}
            >
              {menuOpen ? (
                /* X icon */
                <svg width={18} height={18} viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5} fill="none">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg width={18} height={18} viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5} fill="none">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* ── Mobile dropdown ── */}
        {isMobile && menuOpen && (
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "8px 20px 14px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              background: "#1b4332",
            }}
          >
            {navLinks}
            {isAuthed && user?.email && (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  padding: "6px 13px",
                  marginTop: 4,
                }}
              >
                {user.email}
              </span>
            )}
          </nav>
        )}
      </div>

      <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
        <Outlet />
      </div>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAuthed = !!localStorage.getItem("access");
  const location = useLocation();

  if (isAuthed) {
    const destination = user?.producer_profile ? "/producer/dashboard" : "/";
    return <Navigate to={destination} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = !!localStorage.getItem("access");
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        <Route path="/producers" element={<RequireAuth><Producers /></RequireAuth>} />
        <Route path="/producers/:id" element={<ProducerDetail />} />

        <Route path="/signup" element={<AuthGate><Signup /></AuthGate>} />
        <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
        <Route path="/logout" element={<Logout />} />

        <Route path="/user" element={<RequireAuth><User /></RequireAuth>} />

        <Route path="/sustainability" element={<Sustainability />} />
        <Route path="/rescue-market" element={<RescueMarket />} />
        <Route path="/community" element={<CommunityHub />} />
        <Route path="/resolution-center" element={<ResolutionCenter />} />

        {/* Producer only routes */}
        <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
          <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        </Route>

        {/* Customer only routes */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderNumber" element={<OrderDetail />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>

        {/* Admin only routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all — MUST be last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;