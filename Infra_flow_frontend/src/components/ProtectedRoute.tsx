import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../hooks/useAuth';
import { getDashboardRouteByRole } from '../utils/routes';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute = ({ allowedRoles, redirectTo = '/login' }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardRouteByRole(user.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
