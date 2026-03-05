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
import Producers from "./pages/Producers";
import ProducerDetail from "./pages/ProducerDetail";


function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Navigate to="/login" replace />;
}

function Layout() {
  const { user, authTokens } = useAuth();

  // Reactive auth state (updates right after login/logout)
  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");

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

              {isAuthed && user?.role === "producer" && (
                <NavLink to="/producer/dashboard" style={pill}>
                  Producer Dashboard
                </NavLink>
              )}

              {isAuthed && user?.role === "customer" && (
                <NavLink to="/orders" style={pill}>
                  Orders
                </NavLink>
              )}

              {isAuthed && (
                <NavLink to="/producers" style={pill}>
                  Producers
                </NavLink>
              )}

            </nav>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
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
  children,
}: {
  children: React.ReactNode;
}) {
  const { authTokens } = useAuth();
  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");
  const location = useLocation();

  if (isAuthed) {
    return <Navigate to="/user" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

// Protect routes like /user
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authTokens } = useAuth();
  const isAuthed = !!authTokens?.access || !!localStorage.getItem("access");
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

      <Route path="/signup" element={<AuthGate><Signup /></AuthGate>} />
      <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
      <Route path="/logout" element={<Logout />} />

      <Route path="/user" element={<RequireAuth><User /></RequireAuth>} />

      {/*Only producers can access the dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
        <Route path="/producer/dashboard" element={<ProducerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/orders" element={<Orders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />

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

        <Route element={<ProtectedRoute allowedRoles={["producer"]} />}>
          <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/orders" element={<Orders />} />
        </Route>

        <Route path="/producers/:id" element={<ProducerDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />  

      </Route>
    </Routes>
  );
}

export default App;