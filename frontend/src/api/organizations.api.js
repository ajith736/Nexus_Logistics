import api from './axios';

export const organizationsApi = {
  list: (params) => api.get('/organizations', { params }),

  get: (id) => api.get(`/organizations/${id}`),

  create: (data) => api.post('/organizations', data),

  update: (id, data) => api.patch(`/organizations/${id}`, data),

  activate: (id) => api.patch(`/organizations/${id}`, { status: 'active' }),

  suspend: (id) => api.patch(`/organizations/${id}`, { status: 'suspended' }),
};
