const ROLES = Object.freeze({
  SUPERADMIN: 'superadmin',
  DISPATCHER: 'dispatcher',
});

const AGENT_STATUSES = Object.freeze({
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  BUSY: 'busy',
});

const ORDER_STATUSES = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
});

const ORG_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

const UPLOAD_STATUSES = Object.freeze({
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

const PERFORMER_MODELS = Object.freeze({
  USER: 'User',
  AGENT: 'Agent',
});

module.exports = {
  ROLES,
  AGENT_STATUSES,
  ORDER_STATUSES,
  ORG_STATUSES,
  UPLOAD_STATUSES,
  PERFORMER_MODELS,
};
