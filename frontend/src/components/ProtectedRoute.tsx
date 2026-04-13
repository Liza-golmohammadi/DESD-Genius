import useAuth from "../context/useAuth";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" />;

  // Producer check
  if (allowedRoles.includes("producer") && !user?.producer_profile) {
    return <Navigate to="/" replace />;
  }

  // Customer check — producers can't access customer-only routes
  if (allowedRoles.includes("customer") && user?.producer_profile) {
    return <Navigate to="/producer/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
