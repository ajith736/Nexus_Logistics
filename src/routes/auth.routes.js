const { Router } = require('express');
const { login, refreshAccessToken, agentLogin, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginSchema, refreshTokenSchema, agentLoginSchema } = require('../validators/auth.validator');

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, validate(refreshTokenSchema), refreshAccessToken);
router.post('/agent-login', authLimiter, validate(agentLoginSchema), agentLogin);
router.post('/logout', verifyToken, logout);

module.exports = router;
