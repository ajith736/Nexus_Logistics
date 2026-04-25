export const ROLES = {
  SUPERADMIN: 'superadmin',
  DISPATCHER: 'dispatcher',
  AGENT: 'agent',
};

export const ORDER_STATUSES = {
  CREATED: 'created',
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
};

export const AGENT_STATUSES = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  BUSY: 'busy',
};

export const STATUS_COLORS = {
  created: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  available: 'bg-green-100 text-green-800',
  unavailable: 'bg-gray-100 text-gray-500',
  busy: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-800',
  queued: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

export const AGENT_STATUS_LABELS = {
  available: 'Available',
  unavailable: 'Offline',
  busy: 'Actively Delivering',
};
