const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const Order = require('../models/Order');
const { success, paginated, error } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { emitToOrg } = require('../config/socket');
const { logAudit } = require('../services/audit.service');

async function createAgent(req, res, next) {
  try {
    const { name, phone, pin } = req.body;
    const orgId = req.user.orgId;

    const agent = await Agent.create({ name, phone, pin, orgId });

    logAudit({
      action: 'agent.created',
      performedBy: req.user.id,
      performedByModel: 'User',
      orgId,
      metadata: { agentId: String(agent._id), agentName: agent.name },
    });

    return success(res, {
      id: agent._id,
      name: agent.name,
      phone: agent.phone,
      status: agent.status,
      orgId: agent.orgId,
      createdAt: agent.createdAt,
    }, 'Agent created', 201);
  } catch (err) {
    next(err);
  }
}

async function listAgents(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orgId = req.user.orgId;
    const orgObjectId = new mongoose.Types.ObjectId(String(orgId));
    const requestedStatus = req.query.status;
    const activeOrderStatuses = ['assigned', 'out_for_delivery'];

    // "busy" is derived from active orders, not persisted on Agent.
    if (requestedStatus === 'busy') {
      const allAgents = await Agent.find({ orgId }).sort({ createdAt: -1 }).lean();
      const agentIds = allAgents.map((a) => a._id);

      const activeCounts = agentIds.length
        ? await Order.aggregate([
          {
            $match: {
              orgId: orgObjectId,
              assignedTo: { $in: agentIds },
              status: { $in: activeOrderStatuses },
            },
          },
          { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        ])
        : [];

      const countMap = new Map(activeCounts.map((r) => [String(r._id), r.count]));
      const busyAgents = allAgents
        .map((a) => {
          const activeOrdersCount = countMap.get(String(a._id)) || 0;
          const baseStatus = a.status === 'busy' ? 'available' : a.status;
          return {
            ...a,
            activeOrdersCount,
            displayStatus: activeOrdersCount > 0 ? 'busy' : baseStatus,
          };
        })
        .filter((a) => a.displayStatus === 'busy');

      const docs = busyAgents.slice(skip, skip + limit);
      return paginated(res, { docs, total: busyAgents.length, page, limit });
    }

    const filter = { orgId };
    if (requestedStatus === 'available' || requestedStatus === 'unavailable') {
      filter.status = requestedStatus;
    }

    const [agents, total] = await Promise.all([
      Agent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Agent.countDocuments(filter),
    ]);

    const agentIds = agents.map((a) => a._id);
    const activeCounts = agentIds.length
      ? await Order.aggregate([
        {
          $match: {
            orgId: orgObjectId,
            assignedTo: { $in: agentIds },
            status: { $in: activeOrderStatuses },
          },
        },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ])
      : [];

    const countMap = new Map(activeCounts.map((r) => [String(r._id), r.count]));
    const docs = agents.map((a) => {
      const activeOrdersCount = countMap.get(String(a._id)) || 0;
      const baseStatus = a.status === 'busy' ? 'available' : a.status;
      return {
        ...a,
        activeOrdersCount,
        displayStatus: activeOrdersCount > 0 ? 'busy' : baseStatus,
      };
    });

    return paginated(res, { docs, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getAgent(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const agent = await Agent.findOne({ _id: req.params.id, orgId });

    if (!agent) return error(res, 'Agent not found', 404, 'NOT_FOUND');

    return success(res, agent);
  } catch (err) {
    next(err);
  }
}

async function updateAgent(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const agent = await Agent.findOne({ _id: req.params.id, orgId });

    if (!agent) return error(res, 'Agent not found', 404, 'NOT_FOUND');

    Object.assign(agent, req.body);
    await agent.save();

    const updated = await Agent.findById(agent._id);
    return success(res, updated, 'Agent updated');
  } catch (err) {
    next(err);
  }
}

async function toggleStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (req.user.role === 'agent' && String(req.user.id) !== String(req.params.id)) {
      return error(res, 'Agents can only update their own status', 403, 'FORBIDDEN');
    }

    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { status },
      { new: true, runValidators: true }
    );

    if (!agent) return error(res, 'Agent not found', 404, 'NOT_FOUND');

    emitToOrg(req.user.orgId, 'agent:statusChanged', {
      agentId: agent._id,
      newStatus: agent.status,
    });

    const performerModel = req.user.role === 'agent' ? 'Agent' : 'User';
    logAudit({
      action: 'agent.statusChanged',
      performedBy: req.user.id,
      performedByModel: performerModel,
      orgId: req.user.orgId,
      metadata: { agentId: String(agent._id), newStatus: agent.status },
    });

    return success(res, agent, 'Agent status updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { createAgent, listAgents, getAgent, updateAgent, toggleStatus };
