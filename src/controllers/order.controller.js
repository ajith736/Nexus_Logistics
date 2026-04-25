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

    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo && req.user.role !== 'agent') {
      filter.assignedTo = req.query.assignedTo;
    }

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

async function getOrder(req, res, next) {
  try {
    const orgId = req.user.orgId;
    const filter = { _id: req.params.id, orgId };

    if (req.user.role === 'agent') {
      filter.assignedTo = req.user.id;
    }

    const order = await Order.findOne(filter)
      .populate('assignedTo', 'name phone');

    if (!order) return error(res, 'Order not found', 404, 'NOT_FOUND');

    const statusLogs = await OrderStatusLog.find({ orderId: order._id })
      .sort({ createdAt: 1 });

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

    const assignable = [ORDER_STATUSES.CREATED, ORDER_STATUSES.PENDING];
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

    if (agent.status !== AGENT_STATUSES.AVAILABLE) {
      return error(res, `Agent is currently "${agent.status}"`, 400, 'AGENT_UNAVAILABLE');
    }

    const previousStatus = order.status;
    order.assignedTo = agent._id;
    order.status = ORDER_STATUSES.ASSIGNED;
    await order.save();

    agent.status = AGENT_STATUSES.BUSY;
    await agent.save({ validateModifiedOnly: true });

    await OrderStatusLog.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: ORDER_STATUSES.ASSIGNED,
      changedBy: req.user.id,
      changedByModel: 'User',
    });

    const populated = await Order.findById(order._id)
      .populate('assignedTo', 'name phone');

    emitToOrg(orgId, 'order:statusChanged', {
      orderId: order.orderId,
      newStatus: ORDER_STATUSES.ASSIGNED,
      agentName: agent.name,
    });

    logAudit({
      action: 'order.agentAssigned',
      performedBy: req.user.id,
      performedByModel: 'User',
      orgId,
      metadata: { orderId: order.orderId, agentId: String(agent._id), agentName: agent.name },
    });

    return success(res, populated, 'Agent assigned to order');
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

    if (
      [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.FAILED].includes(newStatus) &&
      order.assignedTo
    ) {
      await Agent.findByIdAndUpdate(order.assignedTo, {
        status: AGENT_STATUSES.AVAILABLE,
      });
    }

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

    return success(res, order, 'Order status updated');
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrder, assignAgent, updateOrderStatus };
