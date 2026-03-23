import useAuth from "../context/useAuth";
import { Navigate, Outlet } from "react-router";

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" />;
  if (!user.role || !allowedRoles.includes(user.role))
    return <Navigate to="/" />;

  return <Outlet />;
};

export default ProtectedRoute;
