const mongoose = require('mongoose');
const Order = require('../models/Order');
const Agent = require('../models/Agent');
const Counter = require('../models/Counter');
const OrderStatusLog = require('../models/OrderStatusLog');
const { success, paginated, error } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { ORDER_STATUSES, AGENT_STATUSES } = require('../utils/constants');
const { emitToOrg } = require('../config/socket');
const { logAudit } = require('../services/audit.service');

const VALID_TRANSITIONS = {
  [ORDER_STATUSES.CREATED]: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.FAILED],
  [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.FAILED],
  [ORDER_STATUSES.ASSIGNED]: [ORDER_STATUSES.OUT_FOR_DELIVERY, ORDER_STATUSES.FAILED],
  [ORDER_STATUSES.OUT_FOR_DELIVERY]: [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.FAILED],
  [ORDER_STATUSES.DELIVERED]: [],
  [ORDER_STATUSES.FAILED]: [],
};

/**
 * Parse a YYYY-MM-DD string into a Date at the START (00:00:00.000) or
 * END (23:59:59.999) of that day in the server's LOCAL timezone.
 * Using new Date(y, m, d, ...) (multi-arg constructor) always uses local time,
 * so the filter boundaries are always midnight-to-midnight in IST.
 */
function parseDateLocal(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** @param {Record<string, string>} query */
function buildCreatedAtRangeFilter(query) {
  const { createdFrom, createdTo } = query;
  if (!createdFrom && !createdTo) return null;
  const range = {};
  const from = parseDateLocal(createdFrom, false);
  const to = parseDateLocal(createdTo, true);
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return Object.keys(range).length ? range : null;
}

async function runAssignOrderToAgent({ order, agent, orgId, userId }) {
  const previousStatus = order.status;
  order.assignedTo = agent._id;
  order.status = ORDER_STATUSES.ASSIGNED;
  await order.save();

  await OrderStatusLog.create({
    orderId: order._id,
    fromStatus: previousStatus,
    toStatus: ORDER_STATUSES.ASSIGNED,
    changedBy: userId,
    changedByModel: 'User',
  });

  const populated = await Order.findById(order._id).populate('assignedTo', 'name phone');

  emitToOrg(orgId, 'order:statusChanged', {
    orderId: order.orderId,
    newStatus: ORDER_STATUSES.ASSIGNED,
    agentName: agent.name,
  });

  logAudit({
    action: 'order.agentAssigned',
    performedBy: userId,
    performedByModel: 'User',
    orgId,
    metadata: { orderId: order.orderId, agentId: String(agent._id), agentName: agent.name },
  });

  return populated;
}

async function createOrder(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const { saleOrderId, customerName, customerPhone, customerAddress, packageDetails } = req.body;

    const seq = await Counter.getNextSequence('orderId');
    const orderId = `ORD-${String(seq).padStart(6, '0')}`;

    const order = await Order.create({
      orderId,
      saleOrderId,
      customerName,
      customerPhone,
      customerAddress,
      packageDetails,
      orgId,
    });

    await OrderStatusLog.create({
      orderId: order._id,
      fromStatus: null,
      toStatus: ORDER_STATUSES.CREATED,
      changedBy: req.user.id,
      changedByModel: 'User',
    });

    logAudit({
      action: 'order.created',
      performedBy: req.user.id,
      performedByModel: 'User',
      orgId,
      metadata: { orderId: order.orderId },
    });

    return success(res, order, 'Order created', 201);
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orgId = req.user.orgId;
    const filter = { orgId };

    if (req.user.role === 'agent') {
      filter.assignedTo = req.user.id;
    }

    if (req.query.statuses) {
      filter.status = { $in: req.query.statuses.split(',').map((s) => s.trim()) };
    } else if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.assignedTo && req.user.role !== 'agent') {
      filter.assignedTo = req.query.assignedTo;
    }

    const createdRange = buildCreatedAtRangeFilter(req.query);
    if (createdRange) filter.createdAt = createdRange;

    const [docs, total] = await Promise.all([
      Order.find(filter)
        .populate('assignedTo', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return paginated(res, { docs, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function orderStats(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const orgObjectId = new mongoose.Types.ObjectId(String(orgId));
    const match = { orgId: orgObjectId };
    const createdRange = buildCreatedAtRangeFilter(req.query);
    if (createdRange) match.createdAt = createdRange;

    const [groups, total] = await Promise.all([
      Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.countDocuments(match),
    ]);

    const byStatus = {};
    Object.values(ORDER_STATUSES).forEach((s) => {
      byStatus[s] = 0;
    });
    for (const g of groups) {
      if (g._id) byStatus[g._id] = g.count;
    }

    return success(res, { total, byStatus });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const filter = { _id: req.params.id, orgId };

    if (req.user.role === 'agent') {
      filter.assignedTo = req.user.id;
    }

    const order = await Order.findOne(filter).populate('assignedTo', 'name phone');

    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const statusLogs = await OrderStatusLog.find({ orderId: order._id }).sort({ createdAt: 1 });

    return success(res, { ...order.toObject(), statusLogs });
  } catch (err) {
    next(err);
  }
}

async function assignAgent(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const { agentId } = req.body;

    const order = await Order.findOne({ _id: req.params.id, orgId });
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const assignable = [ORDER_STATUSES.CREATED, ORDER_STATUSES.PENDING, ORDER_STATUSES.FAILED];
    if (!assignable.includes(order.status)) {
      return error(
        res,
        `Cannot assign agent — order status is "${order.status}"`,
        400,
        'INVALID_STATUS'
      );
    }

    const agent = await Agent.findOne({ _id: agentId, orgId });
    if (!agent) return error(res, 'Agent not found in your organization', 404, 'AGENT_NOT_FOUND');

    const populated = await runAssignOrderToAgent({
      order,
      agent,
      orgId,
      userId: req.user.id,
    });

    return success(res, populated, 'Agent assigned to order');
  } catch (err) {
    next(err);
  }
}

async function bulkAssignAgent(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const { orderIds, agentId } = req.body;

    const agent = await Agent.findOne({ _id: agentId, orgId });
    if (!agent) return error(res, 'Agent not found in your organization', 404, 'AGENT_NOT_FOUND');

    const orders = await Order.find({ _id: { $in: orderIds }, orgId });
    if (orders.length !== orderIds.length) {
      return error(res, 'One or more orders were not found in your organization', 400, 'NOT_FOUND');
    }

    const assignable = [ORDER_STATUSES.CREATED, ORDER_STATUSES.PENDING, ORDER_STATUSES.FAILED];
    const bad = orders.find((o) => !assignable.includes(o.status));
    if (bad) {
      return error(
        res,
        `Cannot assign — order ${bad.orderId} has status "${bad.status}" (only created, pending, or failed orders can be re-assigned).`,
        400,
        'INVALID_STATUS'
      );
    }

    const results = [];
    for (const order of orders) {
      // eslint-disable-next-line no-await-in-loop
      const populated = await runAssignOrderToAgent({
        order,
        agent,
        orgId,
        userId: req.user.id,
      });
      results.push(populated);
    }

    return success(res, { count: results.length, orders: results }, 'Orders assigned to agent');
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const { status: newStatus } = req.body;

    const order = await Order.findOne({ _id: req.params.id, orgId });
    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    if (req.user.role === 'agent') {
      if (!order.assignedTo || String(order.assignedTo) !== String(req.user.id)) {
        return error(res, 'You can only update orders assigned to you', 403, 'FORBIDDEN');
      }
    }

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return error(
        res,
        `Cannot transition from "${order.status}" to "${newStatus}"`,
        400,
        'INVALID_TRANSITION'
      );
    }

    const previousStatus = order.status;
    order.status = newStatus;
    await order.save();

    const changedByModel = req.user.role === 'agent' ? 'Agent' : 'User';
    await OrderStatusLog.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: newStatus,
      changedBy: req.user.id,
      changedByModel,
    });

    let agentName = null;
    if (order.assignedTo) {
      const assignedAgent = await Agent.findById(order.assignedTo).lean();
      agentName = assignedAgent?.name || null;
    }

    emitToOrg(orgId, 'order:statusChanged', {
      orderId: order.orderId,
      newStatus,
      agentName,
    });

    logAudit({
      action: 'order.statusChanged',
      performedBy: req.user.id,
      performedByModel: changedByModel,
      orgId,
      metadata: { orderId: order.orderId, fromStatus: previousStatus, toStatus: newStatus },
    });

    if (
      order.assignedTo &&
      (newStatus === ORDER_STATUSES.DELIVERED || newStatus === ORDER_STATUSES.FAILED)
    ) {
      const stillActive = await Order.countDocuments({
        orgId,
        assignedTo: order.assignedTo,
        status: { $in: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.OUT_FOR_DELIVERY] },
      });
      if (stillActive === 0) {
        const cleared = await Agent.findOneAndUpdate(
          { _id: order.assignedTo, orgId, status: AGENT_STATUSES.BUSY },
          { status: AGENT_STATUSES.AVAILABLE },
          { new: true }
        );
        if (cleared) {
          emitToOrg(orgId, 'agent:statusChanged', {
            agentId: cleared._id,
            newStatus: cleared.status,
          });
        }
      }
    }

    return success(res, order, 'Order status updated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  listOrders,
  orderStats,
  bulkAssignAgent,
  getOrder,
  assignAgent,
  updateOrderStatus,
};
