import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Package, LogOut, Truck, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { agentsApi } from '@/api/agents.api';
import { cn } from '@/lib/utils';

const agentNav = [
  { to: '/my-orders', label: 'My Orders', icon: Package },
];

function AvailabilityToggle() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const status = user?.status;

  const mutation = useMutation({
    mutationFn: (newStatus) => agentsApi.toggleStatus(user.id, newStatus),
    onSuccess: (_, newStatus) => patchUser({ status: newStatus }),
  });

  if (!status) return null;

  if (status === 'busy') {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1">
        <Truck className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-xs font-medium text-amber-200">On Delivery</span>
      </div>
    );
  }

  const isAvailable = status === 'available';

  return (
    <button
      onClick={() => mutation.mutate(isAvailable ? 'unavailable' : 'available')}
      disabled={mutation.isPending}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        isAvailable
          ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
          : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
      )}
    >
      {mutation.isPending ? (
        <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : isAvailable ? (
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      {mutation.isPending ? '…' : isAvailable ? 'Online' : 'Offline'}
    </button>
  );
}

export default function MobileShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dark = useAuthStore((s) => s.dark);
  const toggle = useAuthStore((s) => s.toggleDark);

  const handleLogout = () => {
    logout();
    navigate('/agent-login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="font-semibold text-sm">{user?.name ?? 'Agent'}</span>
        </div>

          <div className="flex items-center gap-2">
            <AvailabilityToggle />
            <button
              onClick={toggle}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 flex shrink-0">
        {agentNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
