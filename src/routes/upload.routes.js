const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadCsvLimiter } = require('../middleware/rateLimiter');
const { uploadMiddleware, downloadSampleCsv, uploadCSV, listUploads, getUpload } = require('../controllers/upload.controller');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(verifyToken);

/**
 * @swagger
 * /api/uploads:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload CSV for bulk order import (dispatcher)
 *     description: |
 *       Send a CSV file as multipart/form-data with field name **file** (max 10 MB).
 *       Requires Redis. The file is queued for background processing — response is 202 immediately.
 *       Listen to socket events `upload:progress` and `upload:complete` for live updates.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with order rows
 *     responses:
 *       202:
 *         description: File accepted and queued for processing
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
 *                     jobId:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: queued
 *       400:
 *         description: No file provided or invalid file type
 *       429:
 *         description: Too many uploads — rate limit exceeded
 *       503:
 *         description: Redis is disabled or upload queue is unavailable
 */
router.post('/', requireRole(ROLES.DISPATCHER), uploadCsvLimiter, uploadMiddleware, uploadCSV);

/**
 * @swagger
 * /api/uploads/sample:
 *   get:
 *     tags:
 *       - Uploads
 *     summary: Download sample CSV template (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sample CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/sample', requireRole(ROLES.DISPATCHER), downloadSampleCsv);

/**
 * @swagger
 * /api/uploads:
 *   get:
 *     tags:
 *       - Uploads
 *     summary: List upload jobs for your organization (dispatcher)
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
 *           enum: [queued, processing, completed, failed]
 *     responses:
 *       200:
 *         description: Paginated list of upload jobs
 */
router.get('/', requireRole(ROLES.DISPATCHER), listUploads);

/**
 * @swagger
 * /api/uploads/{id}:
 *   get:
 *     tags:
 *       - Uploads
 *     summary: Get upload job details (dispatcher)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UploadJob MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Upload job found
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
 *                     _id:
 *                       type: string
 *                     originalName:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [queued, processing, completed, failed]
 *                     totalRows:
 *                       type: integer
 *                     successCount:
 *                       type: integer
 *                     failCount:
 *                       type: integer
 *                     errorFileUrl:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Upload job not found
 */
router.get('/:id', requireRole(ROLES.DISPATCHER), getUpload);

module.exports = router;
