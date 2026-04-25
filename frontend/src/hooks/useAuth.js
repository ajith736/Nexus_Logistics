import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function useAuth() {
  const { accessToken, user, setAuth, clearAuth } = useAuthStore();

  const login = ({ accessToken, refreshToken, user }) => {
    setAuth({ accessToken, refreshToken, user });
    connectSocket(accessToken);
  };

  const logout = () => {
    disconnectSocket();
    clearAuth();
  };

  const isAuthenticated = Boolean(accessToken);

  return { accessToken, user, isAuthenticated, login, logout };
}
