import api from './axios';

export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  agentLogin: (phone, pin) =>
    api.post('/auth/agent-login', { phone, pin }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post('/auth/logout'),
};
