import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Upload,
  Building2,
  UserCog,
  LogOut,
  Truck,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { ROLES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const superadminNav = [
  { to: '/orgs', label: 'Organizations', icon: Building2 },
  { to: '/users', label: 'Users', icon: UserCog },
];

const dispatcherNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Users },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/uploads', label: 'Uploads', icon: Upload },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === ROLES.SUPERADMIN ? superadminNav : dispatcherNav;
  const dark = useAuthStore((s) => s.dark);
  const toggle = useAuthStore((s) => s.toggleDark);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-slate-900 text-slate-100 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
          <Truck className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">Nexus Logistics</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
            </div>
            <button
              onClick={toggle}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
