const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadCsvLimiter } = require('../middleware/rateLimiter');
const { uploadMiddleware, downloadSampleCsv, uploadCSV, listUploads, getUpload } = require('../controllers/upload.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken);

router.post('/', requireRole(ROLES.DISPATCHER), uploadCsvLimiter, uploadMiddleware, uploadCSV);
router.get('/sample', requireRole(ROLES.DISPATCHER), downloadSampleCsv);
router.get('/', requireRole(ROLES.DISPATCHER), listUploads);
router.get('/:id', requireRole(ROLES.DISPATCHER), getUpload);

module.exports = router;
