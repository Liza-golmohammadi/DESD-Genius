import useAuth from "../context/useAuth";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles.includes("producer") && !user?.producer_profile) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
