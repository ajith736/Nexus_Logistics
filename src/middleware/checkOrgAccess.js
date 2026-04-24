const { ROLES } = require('../utils/constants');

function checkOrgAccess(req, res, next) {
  if (req.user.role === ROLES.SUPERADMIN) return next();

  const resourceOrgId = req.params.orgId || req.body.orgId || req.query.orgId;

  if (resourceOrgId && String(req.user.orgId) !== String(resourceOrgId)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden — organization access denied',
      errorCode: 'ORG_ACCESS_DENIED',
    });
  }

  next();
}

module.exports = checkOrgAccess;
