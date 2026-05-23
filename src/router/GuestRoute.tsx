import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboard } from './roleRoutes';

export function GuestRoute() {
  const { auth } = useAuth();
  if (auth.status === 'authenticated') {
    return <Navigate to={getRoleDashboard(auth.user.role)} replace />;
  }
  return <Outlet />;
}
