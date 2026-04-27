const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createOrgSchema, updateOrgSchema } = require('../validators/organization.validator');
const {
  createOrg, listOrgs, getOrg, updateOrg,
} = require('../controllers/organization.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken, requireRole(ROLES.SUPERADMIN));

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     tags:
 *       - Organizations
 *     summary: Create organization (superadmin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Nexus Deliveries
 *     responses:
 *       201:
 *         description: Organization created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not superadmin
 */
router.post('/', validate(createOrgSchema), createOrg);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     tags:
 *       - Organizations
 *     summary: List organizations (superadmin)
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
 *           enum: [active, suspended]
 *     responses:
 *       200:
 *         description: Paginated list of organizations
 */
router.get('/', listOrgs);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     tags:
 *       - Organizations
 *     summary: Get organization by ID (superadmin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Organization found
 *       404:
 *         description: Not found
 */
router.get('/:id', getOrg);

/**
 * @swagger
 * /api/organizations/{id}:
 *   patch:
 *     tags:
 *       - Organizations
 *     summary: Update organization name or status (superadmin)
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
 *               status:
 *                 type: string
 *                 enum: [active, suspended]
 *             description: At least one field required
 *     responses:
 *       200:
 *         description: Organization updated
 *       404:
 *         description: Not found
 */
router.patch('/:id', validate(updateOrgSchema), updateOrg);

module.exports = router;
