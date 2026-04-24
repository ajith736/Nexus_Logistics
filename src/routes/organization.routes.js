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

router.post('/', validate(createOrgSchema), createOrg);
router.get('/', listOrgs);
router.get('/:id', getOrg);
router.patch('/:id', validate(updateOrgSchema), updateOrg);

module.exports = router;
