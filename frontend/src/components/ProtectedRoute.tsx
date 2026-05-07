import useAuth from "../context/useAuth";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  const userRole =
    (user as { role?: string }).role ??
    ((user as { producer_profile?: unknown }).producer_profile ? "producer" : "customer");

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;