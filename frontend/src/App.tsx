import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import useAuth from "./context/useAuth";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import User from "./pages/User";
import ProtectedRoute from "./components/ProtectedRoute";
import Products from "./pages/Products";
import Orders from "./pages/Orders";

function Logout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, []);

  return <Navigate to="/login" />;
}

function SignupAndLogout() {
  const { logoutUser } = useAuth();

  useEffect(() => {
    logoutUser();
  }, []);

  return <Signup />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignupAndLogout />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/user" element={<User />} />
      {/* Producer Only */}
      <Route
        path="/producer"
        element={<ProtectedRoute allowedRoles={["producer"]} />} /* PRODUCER DASHBOARD */
      >
        <Route path="products" element={<Products />} />  
      </Route>

      {/* Customer Only */}
      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="orders" element={<Orders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
