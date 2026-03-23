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
import OrderDetail from "./pages/OrderDetail";
import Producers from "./pages/Producers";
import ProducerDetail from "./pages/ProducerDetail";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentsPage from "./pages/PaymentsPage";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";

// ---------------- LOGOUT ----------------
function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Navigate to="/login" replace />;
}

// ---------------- LAYOUT ----------------
function Layout() {
  const { user, authTokens } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");

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
    color: "#fff",
    textDecoration: "none",
  };

  const navRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const pill = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
    background: isActive ? "#2d6a4f" : "transparent",
  });

  const authBtn = (active = false): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.3)",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    color: active ? "#1b4332" : "#fff",
    background: active ? "#fff" : "transparent",
  });

  const cartIconWrap: React.CSSProperties = {
    position: "relative",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const searchFormStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: 420,
    display: "flex",
    margin: "0 12px",
  };

  const searchInputStyle: React.CSSProperties = {
    flex: 1,
    padding: "9px 16px",
    border: "none",
    borderRadius: "10px 0 0 10px",
    fontSize: 14,
    outline: "none",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
  };

  const searchButtonStyle: React.CSSProperties = {
    padding: "9px 14px",
    border: "none",
    borderRadius: "0 10px 10px 0",
    background: "#40916c",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  };

  return (
    <>
      <div style={headerWrap}>
        <div style={headerInner}>
          {/* LEFT */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <NavLink to="/" style={brand}>
              BRISTOL FOOD NETWORK
            </NavLink>

            <nav style={navRow}>
              <NavLink to="/" style={pill} end>
                Home
              </NavLink>

              {isAuthed && (
                <NavLink to="/producers" style={pill}>
                  Producers
                </NavLink>
              )}

              {isAuthed && user?.role === "producer" && (
                <NavLink to="/producer/dashboard" style={pill}>
                  Dashboard
                </NavLink>
              )}

              {isAuthed && user?.role === "customer" && (
                <>
                  <NavLink to="/orders" style={pill}>
                    My Orders
                  </NavLink>
                  <NavLink to="/checkout" style={pill}>
                    Checkout
                  </NavLink>
                </>
              )}

              <NavLink to="/user" style={pill}>
                User
              </NavLink>
    
            </nav>
          </div>

          {/* SEARCH */}
          <form onSubmit={handleSearch} style={searchFormStyle}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              style={searchInputStyle}
            />
            <button type="submit" style={searchButtonStyle}>
              &#128269;
            </button>
          </form>

          {/* RIGHT */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isAuthed && user?.role === "customer" && (
              <NavLink to="/cart" style={{ display: "flex", alignItems: "center" }}>
                <div style={cartIconWrap}>
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2}
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
              </NavLink>
            )}

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

      <div style={{ minHeight: "100vh" }}>
        <Outlet />
      </div>
    </>
  );
}

// ---------------- AUTH GATES ----------------
function AuthGate({ children }: { children: React.ReactNode }) {
  const { authTokens } = useAuth();
  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");
  const location = useLocation();

  if (isAuthed) return <Navigate to="/user" replace state={{ from: location }} />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authTokens } = useAuth();
  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");
  const location = useLocation();

  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

// ---------------- APP ----------------
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        <Route
          path="/signup"
          element={
            <AuthGate>
              <Signup />
            </AuthGate>
          }
        />
        <Route
          path="/login"
          element={
            <AuthGate>
              <Login />
            </AuthGate>
          }
        />
        <Route path="/logout" element={<Logout />} />

        <Route
          path="/user"
          element={
            <RequireAuth>
              <User />
            </RequireAuth>
          }
        />

        <Route
          path="/producers"
          element={
            <RequireAuth>
              <Producers />
            </RequireAuth>
          }
        />
        <Route
          path="/producers/:id"
          element={
            <RequireAuth>
              <ProducerDetail />
            </RequireAuth>
          }
        />

        {/* PRODUCER */}
        <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
          <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        </Route>

        {/* CUSTOMER */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderNumber" element={<OrderDetail />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>

        {/* ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;