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
  const [searchInput, setSearchInput] = useState("");

  const isAuthed = !!localStorage.getItem("access");

  const isProducer = !!user?.producer_profile;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchInput.trim())}`);
  }

  const headerWrap: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#1b4332",
    borderBottom: "1px solid #2d6a4f",
  };

  const headerInner: React.CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "13px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  };

  const brand: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 800,
    letterSpacing: 0.2,
    color: "#fff",
    fontSize: 15,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const navRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  };

  const pill = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 10,
    border: isActive ? "1px solid #40916c" : "1px solid transparent",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
    background: isActive ? "#2d6a4f" : "transparent",
    transition: "background 0.15s, color 0.15s",
  });

  const meta: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    padding: "7px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    maxWidth: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const authBtn = (active = false): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.3)",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    color: active ? "#1b4332" : "#fff",
    background: active ? "#fff" : "transparent",
    cursor: "pointer",
  });

  return (
    <>
      <div style={headerWrap}>
        <div style={headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <NavLink to="/" style={brand}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="#40916c">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 0-5 8" />
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.5 }}>
                  BRISTOL
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, opacity: 0.75, marginTop: -2 }}>
                  REGIONAL FOOD NETWORK
                </div>
              </div>
            </NavLink>

            <nav style={navRow}>
              <NavLink to="/" style={pill} end>
                Home
              </NavLink>

              {isAuthed && (
                <NavLink to="/producers" style={pill}>
                  Our Producers
                </NavLink>
              )}

              {isAuthed && isProducer && (
                <NavLink to="/producer/dashboard" style={pill}>
                  Dashboard
                </NavLink>
              )}

              {isAuthed && !isProducer && (
                <NavLink to="/orders" style={pill}>
                  My Orders
                </NavLink>
              )}

              {isAuthed && user?.role === "admin" && (
                <NavLink to="/admin" style={pill}>
                  Admin Panel
                </NavLink>
              )}

              <NavLink to="/sustainability" style={pill}>
                Sustainability
              </NavLink>
            </nav>
          </div>

          <form
            onSubmit={handleSearch}
            style={{ flex: 1, maxWidth: 420, display: "flex", margin: "0 12px" }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search fresh produce, farms, or artisan goods..."
              style={{
                flex: 1,
                padding: "9px 16px",
                border: "none",
                borderRadius: "10px 0 0 10px",
                fontSize: 14,
                outline: "none",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "9px 14px",
                border: "none",
                borderRadius: "0 10px 10px 0",
                background: "#40916c",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              &#128269;
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative", cursor: "pointer" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            {isAuthed && user?.email && <span style={meta}>{user.email}</span>}

            {!isAuthed ? (
              <>
                <NavLink to="/login" style={() => authBtn()}>
                  Login
                </NavLink>
                <NavLink to="/signup" style={() => authBtn(true)}>
                  Sign up
                </NavLink>
              </>
            ) : (
              <NavLink to="/logout" style={() => authBtn()}>
                Logout
              </NavLink>
            )}
          </div>
        </div>
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

        <Route
          path="/producers"
          element={<RequireAuth><Producers /></RequireAuth>}
        />
        <Route
          path="/producers/:id"
          element={<RequireAuth><ProducerDetail /></RequireAuth>}
        />

        <Route path="/signup" element={<AuthGate><Signup /></AuthGate>} />
        <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
        <Route path="/logout" element={<Logout />} />

        <Route path="/user" element={<RequireAuth><User /></RequireAuth>} />

        <Route path="/sustainability" element={<Sustainability />} />

        {/* Producer only routes */}
        <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
          <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        </Route>

        {/* Customer only routes */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/orders" element={<Orders />} />
        </Route>

        {/* Admin only routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all — MUST be last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
