import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket } from '@/lib/socket';
import { Toaster } from '@/components/ui/toaster';

import ProtectedRoute from '@/components/shared/ProtectedRoute';
import RoleGuard from '@/components/shared/RoleGuard';
import AppShell from '@/components/layout/AppShell';
import MobileShell from '@/components/layout/MobileShell';

import LoginPage from '@/pages/auth/LoginPage';
import AgentLoginPage from '@/pages/auth/AgentLoginPage';

import OrgsPage from '@/pages/superadmin/OrgsPage';
import OrgFormPage from '@/pages/superadmin/OrgFormPage';
import UsersPage from '@/pages/superadmin/UsersPage';
import UserFormPage from '@/pages/superadmin/UserFormPage';

import DashboardPage from '@/pages/dispatcher/DashboardPage';
import AgentsPage from '@/pages/dispatcher/AgentsPage';
import AgentFormPage from '@/pages/dispatcher/AgentFormPage';
import OrdersPage from '@/pages/dispatcher/OrdersPage';
import OrderDetailPage from '@/pages/dispatcher/OrderDetailPage';
import OrderFormPage from '@/pages/dispatcher/OrderFormPage';
import UploadsPage from '@/pages/dispatcher/UploadsPage';

import MyOrdersPage from '@/pages/agent/MyOrdersPage';
import MyOrderDetailPage from '@/pages/agent/MyOrderDetailPage';

import { ROLES } from '@/lib/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function SocketInitializer() {
  const accessToken = useAuthStore((s) => s.accessToken);
  useEffect(() => {
    if (accessToken) connectSocket(accessToken);
  }, [accessToken]);
  return null;
}

function ThemeInitializer() {
  const dark = useAuthStore((s) => s.dark);
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketInitializer />
      <ThemeInitializer />
      <Toaster />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/agent-login" element={<AgentLoginPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            {/* SuperAdmin */}
            <Route element={<RoleGuard allowedRoles={[ROLES.SUPERADMIN]} />}>
              <Route element={<AppShell />}>
                <Route path="/orgs" element={<OrgsPage />} />
                <Route path="/orgs/new" element={<OrgFormPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/new" element={<UserFormPage />} />
              </Route>
            </Route>

            {/* Dispatcher */}
            <Route element={<RoleGuard allowedRoles={[ROLES.DISPATCHER]} />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/agents" element={<AgentsPage />} />
                <Route path="/agents/new" element={<AgentFormPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/new" element={<OrderFormPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/uploads" element={<UploadsPage />} />
              </Route>
            </Route>

            {/* Agent */}
            <Route element={<RoleGuard allowedRoles={[ROLES.AGENT]} />}>
              <Route element={<MobileShell />}>
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/my-orders/:id" element={<MyOrderDetailPage />} />
              </Route>
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
