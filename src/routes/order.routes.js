const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { bulkAssignLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  createOrderSchema,
  assignAgentSchema,
  updateOrderStatusSchema,
  bulkAssignSchema,
} = require('../validators/order.validator');
const {
  createOrder,
  listOrders,
  orderStats,
  bulkAssignAgent,
  getOrder,
  assignAgent,
  updateOrderStatus,
} = require('../controllers/order.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create a single order (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [saleOrderId, customerName, customerPhone, customerAddress]
 *             properties:
 *               saleOrderId:
 *                 type: string
 *                 maxLength: 50
 *                 example: SO-2026-001
 *               customerName:
 *                 type: string
 *                 example: Priya Nair
 *               customerPhone:
 *                 type: string
 *                 example: "9123456780"
 *               customerAddress:
 *                 type: string
 *                 example: "12, MG Road, Bengaluru"
 *               packageDetails:
 *                 type: string
 *                 example: "2x T-shirts, 1x Jeans"
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Validation error
 */
router.post('/', requireRole(ROLES.DISPATCHER), validate(createOrderSchema), createOrder);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Order counts grouped by status (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: createdFrom
 *         schema:
 *           type: string
 *         description: "Filter start date — YYYY-MM-DD (server local timezone)"
 *         example: "2026-04-01"
 *       - in: query
 *         name: createdTo
 *         schema:
 *           type: string
 *         description: "Filter end date — YYYY-MM-DD"
 *         example: "2026-04-27"
 *     responses:
 *       200:
 *         description: Status counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 */
router.get('/stats', requireRole(ROLES.DISPATCHER), orderStats);

/**
 * @swagger
 * /api/orders/bulk-assign:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Assign one agent to many orders at once (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderIds, agentId]
 *             properties:
 *               orderIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items:
 *                   type: string
 *                   description: Order MongoDB ObjectId
 *               agentId:
 *                 type: string
 *                 description: Agent MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Orders assigned
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many bulk assign requests
 */
router.post(
  '/bulk-assign',
  requireRole(ROLES.DISPATCHER),
  bulkAssignLimiter,
  validate(bulkAssignSchema),
  bulkAssignAgent
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: List orders (dispatcher sees all org orders; agent sees their own)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, pending, assigned, out_for_delivery, delivered, failed]
 *       - in: query
 *         name: statuses
 *         schema:
 *           type: string
 *         description: Comma-separated statuses e.g. created,assigned
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Agent ObjectId — dispatcher only
 *       - in: query
 *         name: createdFrom
 *         schema:
 *           type: string
 *         description: YYYY-MM-DD
 *       - in: query
 *         name: createdTo
 *         schema:
 *           type: string
 *         description: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Paginated list of orders
 */
router.get('/', requireRole(ROLES.DISPATCHER, 'agent'), listOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order with full status history (dispatcher or assigned agent)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Order with statusLogs array
 *       404:
 *         description: Order not found
 */
router.get('/:id', requireRole(ROLES.DISPATCHER, 'agent'), getOrder);

/**
 * @swagger
 * /api/orders/{id}/assign:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Assign a single agent to an order (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agentId]
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: Agent MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Agent assigned
 *       400:
 *         description: Invalid order status for assignment
 *       404:
 *         description: Order or agent not found
 */
router.patch('/:id/assign', requireRole(ROLES.DISPATCHER), validate(assignAgentSchema), assignAgent);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Update order status (dispatcher or assigned agent)
 *     description: |
 *       Valid transitions — assigned → out_for_delivery; out_for_delivery → delivered or failed.
 *       Dispatcher can also mark created/pending/assigned as failed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [out_for_delivery, delivered, failed]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 */
router.patch('/:id/status', requireRole(ROLES.DISPATCHER, 'agent'), validate(updateOrderStatusSchema), updateOrderStatus);

module.exports = router;
