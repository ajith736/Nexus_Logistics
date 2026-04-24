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

router.post('/', validate(createUserSchema), createUser);
router.get('/', listUsers);
router.get('/:id', getUser);
router.patch('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
