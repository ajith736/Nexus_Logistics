const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAgentSchema, updateAgentSchema, updateAgentStatusSchema,
} = require('../validators/agent.validator');
const {
  createAgent, listAgents, getAgent, updateAgent, toggleStatus,
} = require('../controllers/agent.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken);

/**
 * @swagger
 * /api/agents/{id}/status:
 *   patch:
 *     tags:
 *       - Agents
 *     summary: Set agent availability (dispatcher or the agent themselves)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent MongoDB ObjectId
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
 *                 enum: [available, unavailable]
 *                 example: available
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Agent not found
 */
router.patch('/:id/status', requireRole(ROLES.DISPATCHER, 'agent'), validate(updateAgentStatusSchema), toggleStatus);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     tags:
 *       - Agents
 *     summary: Create a delivery agent (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, pin]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rajesh Singh
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               pin:
 *                 type: string
 *                 description: Exactly 4 digits
 *                 example: "4321"
 *     responses:
 *       201:
 *         description: Agent created
 *       400:
 *         description: Validation error
 */
router.post('/', requireRole(ROLES.DISPATCHER), validate(createAgentSchema), createAgent);

/**
 * @swagger
 * /api/agents:
 *   get:
 *     tags:
 *       - Agents
 *     summary: List agents in your organization (dispatcher)
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
 *           enum: [available, unavailable, busy]
 *     responses:
 *       200:
 *         description: Paginated list of agents
 */
router.get('/', requireRole(ROLES.DISPATCHER), listAgents);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     tags:
 *       - Agents
 *     summary: Get agent by ID (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent found
 *       404:
 *         description: Agent not found in your organization
 */
router.get('/:id', requireRole(ROLES.DISPATCHER), getAgent);

/**
 * @swagger
 * /api/agents/{id}:
 *   patch:
 *     tags:
 *       - Agents
 *     summary: Update agent details (dispatcher)
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
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               pin:
 *                 type: string
 *                 description: 4-digit PIN
 *     responses:
 *       200:
 *         description: Agent updated
 *       404:
 *         description: Agent not found
 */
router.patch('/:id', requireRole(ROLES.DISPATCHER), validate(updateAgentSchema), updateAgent);

module.exports = router;
