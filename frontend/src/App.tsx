import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router";
import useAuth from "./context/useAuth";
import api from "./utils/api";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
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


function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, [logoutUser]);

  return <Navigate to="/login" replace />;
}

function Layout() {
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  // Refresh cart count on route change
  useEffect(() => {
    if (localStorage.getItem("access")) {
      api.get<{ items: any[] }>("/api/orders/cart/")
        .then((res) => {
          const items = res.data.items || [];
          setCartCount(items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0));
        })
        .catch(() => setCartCount(0));
    } else {
      setCartCount(0);
    }
  }, [location.pathname]);

  return (
    <>
      <Navbar cartCount={cartCount} />
      <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
        <Outlet />
      </div>
      <Footer />
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