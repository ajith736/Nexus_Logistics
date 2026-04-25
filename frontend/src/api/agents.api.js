import api from './axios';

export const agentsApi = {
  list: (params) => api.get('/agents', { params }),

  get: (id) => api.get(`/agents/${id}`),

  create: (data) => api.post('/agents', data),

  update: (id, data) => api.patch(`/agents/${id}`, data),

  toggleStatus: (id, status) => api.patch(`/agents/${id}/status`, { status }),
};
