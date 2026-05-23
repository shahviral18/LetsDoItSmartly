import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { auth } = useAuth();
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (auth.status === 'force_reset') return <Navigate to="/force-reset" replace />;
  return <Outlet />;
}
