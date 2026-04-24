const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Organization = require('../models/Organization');
const { success, error } = require('../utils/apiResponse');
const { ORG_STATUSES } = require('../utils/constants');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return error(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return error(res, 'Account is deactivated — contact your administrator', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (user.orgId) {
      const org = await Organization.findById(user.orgId);
      if (org && org.status === ORG_STATUSES.SUSPENDED) {
        return error(res, 'Organization is suspended — contact support', 403, 'ORG_SUSPENDED');
      }
    }

    const tokenPayload = {
      id: user._id,
      role: user.role,
      orgId: user.orgId,
      model: 'User',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user._id, model: 'User' });

    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function refreshAccessToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return error(res, 'Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (decoded.model === 'Agent') {
      return error(res, 'Agents do not support token refresh', 400, 'AGENT_NO_REFRESH');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.isActive) {
      return error(res, 'User not found or deactivated', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (user.refreshToken !== refreshToken) {
      user.refreshToken = null;
      await user.save({ validateModifiedOnly: true });
      return error(res, 'Refresh token reuse detected — all sessions revoked', 401, 'TOKEN_REUSE');
    }

    const tokenPayload = {
      id: user._id,
      role: user.role,
      orgId: user.orgId,
      model: 'User',
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user._id, model: 'User' });

    user.refreshToken = newRefreshToken;
    await user.save({ validateModifiedOnly: true });

    return success(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

async function agentLogin(req, res, next) {
  try {
    const { phone, pin, orgSlug } = req.body;

    const org = await Organization.findOne({ slug: orgSlug });
    if (!org) {
      return error(res, 'Organization not found', 404, 'ORG_NOT_FOUND');
    }

    if (org.status === ORG_STATUSES.SUSPENDED) {
      return error(res, 'Organization is suspended — contact your dispatcher', 403, 'ORG_SUSPENDED');
    }

    const agent = await Agent.findOne({ phone, orgId: org._id }).select('+pin');
    if (!agent) {
      return error(res, 'Invalid phone or PIN', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await agent.comparePin(pin);
    if (!isMatch) {
      return error(res, 'Invalid phone or PIN', 401, 'INVALID_CREDENTIALS');
    }

    const tokenPayload = {
      id: agent._id,
      role: 'agent',
      orgId: agent.orgId,
      model: 'Agent',
    };

    const accessToken = generateAccessToken(tokenPayload);

    return success(res, {
      accessToken,
      agent: {
        id: agent._id,
        name: agent.name,
        phone: agent.phone,
        status: agent.status,
        orgId: agent.orgId,
      },
    }, 'Agent login successful');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user.model === 'Agent') {
      return success(res, null, 'Logged out');
    }

    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    return success(res, null, 'Logged out — refresh token invalidated');
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refreshAccessToken, agentLogin, logout };
