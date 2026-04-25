import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROLES } from '@/lib/constants';

const roleHomeMap = {
  [ROLES.SUPERADMIN]: '/orgs',
  [ROLES.DISPATCHER]: '/dashboard',
  [ROLES.AGENT]: '/my-orders',
};

export default function RoleGuard({ allowedRoles }) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  if (!role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    const home = roleHomeMap[role] || '/login';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
