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

router.post('/', requireRole(ROLES.DISPATCHER), validate(createOrderSchema), createOrder);
router.get('/stats', requireRole(ROLES.DISPATCHER), orderStats);
router.post(
  '/bulk-assign',
  requireRole(ROLES.DISPATCHER),
  bulkAssignLimiter,
  validate(bulkAssignSchema),
  bulkAssignAgent
);
router.get('/', requireRole(ROLES.DISPATCHER, 'agent'), listOrders);
router.get('/:id', requireRole(ROLES.DISPATCHER, 'agent'), getOrder);
router.patch('/:id/assign', requireRole(ROLES.DISPATCHER), validate(assignAgentSchema), assignAgent);
router.patch('/:id/status', requireRole(ROLES.DISPATCHER, 'agent'), validate(updateOrderStatusSchema), updateOrderStatus);

module.exports = router;
