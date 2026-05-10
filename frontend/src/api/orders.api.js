import api from './axios';

export const ordersApi = {
  list: (params) => api.get('/orders', { params }),

  stats: (params) => api.get('/orders/stats', { params }),

  bulkAssign: (body) => api.post('/orders/bulk-assign', body),

  get: (id) => api.get(`/orders/${id}`),

  create: (data) => api.post('/orders', data),

  update: (id, data) => api.patch(`/orders/${id}`, data),

  assign: (id, agentId, version) =>
    api.patch(`/orders/${id}/assign`, {
      agentId,
      ...(version !== undefined && { version }),
    }),

  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),

  myOrders: (params) => api.get('/orders', { params }),

  myActiveOrders: () =>
    api.get('/orders', { params: { statuses: 'assigned,out_for_delivery', limit: 100 } }),

  myHistoryOrders: (page = 1) =>
    api.get('/orders', { params: { statuses: 'delivered,failed', page, limit: 20 } }),
};
