const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit logger. Failures are swallowed so
 * audit logging never breaks the request that triggered it.
 */
function logAudit({ action, performedBy, performedByModel, orgId = null, metadata = {} }) {
  AuditLog.create({ action, performedBy, performedByModel, orgId, metadata }).catch((err) => {
    console.error('Audit log write failed:', err.message);
  });
}

module.exports = { logAudit };
