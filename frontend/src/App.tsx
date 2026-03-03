import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import useAuth from "./context/useAuth";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import User from "./pages/User";
import ProtectedRoute from "./components/ProtectedRoute";
import ProducerDashboard from "./pages/ProducerDashboard";
import Orders from "./pages/Orders";

function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Navigate to="/login" replace />;
}

function SignupAndLogout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Signup />;
}

function Layout({ isAuthed }: { isAuthed: boolean }) {
  const { user } = useAuth();

  const headerWrap: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #f0f0f0",
  };

  const headerInner: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    padding: "14px 16px",
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
  };

  const navRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  const pill = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    textDecoration: "none",
    fontWeight: 700,
    color: isActive ? "#fff" : "#111",
    background: isActive ? "#111" : "#fff",
  });

  const meta: React.CSSProperties = {
    fontSize: 13,
    opacity: 0.75,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    background: "#fff",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div style={headerWrap}>
        <div style={headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={brand}>DESD Genius</div>

            <nav style={navRow}>
              <NavLink to="/" style={pill} end>
                Home
              </NavLink>

              {isAuthed && (
                <NavLink to="/user" style={pill}>
                  User
                </NavLink>
              )}
            </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {isAuthed && user?.email && <span style={meta}>{user.email}</span>}

            {!isAuthed ? (
              <>
                <NavLink to="/login" style={pill}>
                  Login
                </NavLink>
                <NavLink to="/signup" style={pill}>
                  Sign up
                </NavLink>
              </>
            ) : (
              <NavLink to="/logout" style={pill}>
                Logout
              </NavLink>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <Outlet />
      </div>
    </>
  );
}

// Redirect users away from auth pages depending on login state
function AuthGate({
  isAuthed,
  children,
}: {
  isAuthed: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();

  if (isAuthed) {
    // If already logged in, going to /login or /signup should go to /user
    return <Navigate to="/user" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

// Protect routes like /user
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = !!localStorage.getItem("access");
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function App() {
  const isAuthed = !!localStorage.getItem("access");

  return (
    <Routes>
      <Route element={<Layout isAuthed={isAuthed} />}>
        <Route path="/" element={<Home />} />

        <Route
          path="/signup"
          element={
            <AuthGate isAuthed={isAuthed}>
              <SignupAndLogout />
            </AuthGate>
          }
        />

        <Route
          path="/login"
          element={
            <AuthGate isAuthed={isAuthed}>
              <Login />
            </AuthGate>
          }
        />

        <Route path="/logout" element={<Logout />} />

        {/* Basic user page: must be logged in */}
        <Route
          path="/user"
          element={
            <RequireAuth>
              <User />
            </RequireAuth>
          }
        />

        {/* Producer Only */}
        <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
          <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        </Route>

        {/* Customer Only */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/orders" element={<Orders />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;