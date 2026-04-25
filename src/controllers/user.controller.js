const User = require('../models/User');
const Organization = require('../models/Organization');
const { success, paginated, error } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { ROLES } = require('../utils/constants');
const { logAudit } = require('../services/audit.service');

async function createUser(req, res, next) {
  try {
    const { name, email, password, orgId } = req.body;

    const org = await Organization.findById(orgId);
    if (!org) return error(res, 'Organization not found', 404, 'ORG_NOT_FOUND');

    const user = await User.create({
      name,
      email,
      password,
      role: ROLES.DISPATCHER,
      orgId,
    });

    logAudit({
      action: 'user.created',
      performedBy: req.user.id,
      performedByModel: 'User',
      orgId,
      metadata: { userId: String(user._id), email: user.email, role: user.role },
    });

    return success(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }, 'User created', 201);
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { role: ROLES.DISPATCHER };

    if (req.query.orgId) filter.orgId = req.query.orgId;

    const [docs, total] = await Promise.all([
      User.find(filter)
        .populate('orgId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return paginated(res, { docs, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).populate('orgId', 'name slug');
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');

    return success(res, user);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');

    if (user.role === ROLES.SUPERADMIN) {
      return error(res, 'Cannot modify superadmin through this endpoint', 403, 'FORBIDDEN');
    }

    if (req.body.orgId) {
      const org = await Organization.findById(req.body.orgId);
      if (!org) return error(res, 'Organization not found', 404, 'ORG_NOT_FOUND');
    }

    Object.assign(user, req.body);
    await user.save();

    const updated = await User.findById(user._id).populate('orgId', 'name slug');
    return success(res, updated, 'User updated');
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');

    if (user.role === ROLES.SUPERADMIN) {
      return error(res, 'Cannot deactivate superadmin', 403, 'FORBIDDEN');
    }

    user.isActive = false;
    user.refreshToken = null;
    await user.save({ validateModifiedOnly: true });

    logAudit({
      action: 'user.deactivated',
      performedBy: req.user.id,
      performedByModel: 'User',
      orgId: user.orgId,
      metadata: { userId: String(user._id), email: user.email },
    });

    return success(res, null, 'User deactivated');
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, listUsers, getUser, updateUser, deleteUser };
