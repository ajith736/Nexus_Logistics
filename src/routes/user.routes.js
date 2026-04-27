const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');
const {
  createUser, listUsers, getUser, updateUser, deleteUser,
} = require('../controllers/user.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken, requireRole(ROLES.SUPERADMIN));

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create dispatcher user (superadmin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, orgId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Kumar
 *               email:
 *                 type: string
 *                 format: email
 *                 example: rahul@nexus.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: securePass1
 *               orgId:
 *                 type: string
 *                 description: MongoDB ObjectId of the organization
 *                 example: 664f1e2b3c4d5e6f7a8b9c0d
 *     responses:
 *       201:
 *         description: User created
 *       404:
 *         description: Organization not found
 */
router.post('/', validate(createUserSchema), createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List dispatcher users (superadmin)
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
 *         name: orgId
 *         schema:
 *           type: string
 *         description: Filter by organization ObjectId
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get('/', listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID (superadmin)
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
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', getUser);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user (superadmin)
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               orgId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.patch('/:id', validate(updateUserSchema), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user (superadmin)
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
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/:id', deleteUser);

module.exports = router;
