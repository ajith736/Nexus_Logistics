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

router.patch('/:id/status', requireRole(ROLES.DISPATCHER, 'agent'), validate(updateAgentStatusSchema), toggleStatus);

router.post('/', requireRole(ROLES.DISPATCHER), validate(createAgentSchema), createAgent);
router.get('/', requireRole(ROLES.DISPATCHER), listAgents);
router.get('/:id', requireRole(ROLES.DISPATCHER), getAgent);
router.patch('/:id', requireRole(ROLES.DISPATCHER), validate(updateAgentSchema), updateAgent);

module.exports = router;
