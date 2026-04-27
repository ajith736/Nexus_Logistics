const { Router } = require('express');
const { login, refreshAccessToken, agentLogin, logout } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginSchema, refreshTokenSchema, agentLoginSchema } = require('../validators/auth.validator');

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Dispatcher / superadmin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dispatcher@nexus.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login successful — returns accessToken and refreshToken
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
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         orgId:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated or organization suspended
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token (users only — not agents)
 *     description: Provide a valid refreshToken to receive a new accessToken. Detects and blocks token reuse.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New accessToken and refreshToken issued
 *       401:
 *         description: Invalid, expired, or reused refresh token
 */
router.post('/refresh', authLimiter, validate(refreshTokenSchema), refreshAccessToken);

/**
 * @swagger
 * /api/auth/agent-login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Agent login via phone + 4-digit PIN
 *     description: Agents do not receive a refreshToken — only a short-lived accessToken.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, pin]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               pin:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 4
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     accessToken:
 *                       type: string
 *                     agent:
 *                       type: object
 *       401:
 *         description: Invalid phone or PIN
 *       409:
 *         description: Ambiguous — multiple agents share this phone and PIN
 */
router.post('/agent-login', authLimiter, validate(agentLoginSchema), agentLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout (invalidates refresh token for users)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *       401:
 *         description: No token or invalid token
 */
router.post('/logout', verifyToken, logout);

module.exports = router;
