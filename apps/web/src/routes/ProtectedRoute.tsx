import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';

/** Requires a logged-in user AND an active company. */
export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const company = useCompanyStore((s) => s.active);

  if (!token) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/empresas" replace />;
  return <Outlet />;
}
