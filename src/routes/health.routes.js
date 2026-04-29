const { Router } = require('express');
const mongoose = require('mongoose');
const { getRedisConnection, isRedisEnabled } = require('../config/redis');
const { getUploadQueue } = require('../queues/upload.queue');

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     description: No authentication required. Returns 503 if MongoDB is disconnected.
 *     security: []
 *     responses:
 *       200:
 *         description: All services healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 services:
 *                   type: object
 *                   properties:
 *                     mongodb:
 *                       type: string
 *                       example: connected
 *                     redis:
 *                       type: string
 *                       example: connected
 *                     queue:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         waiting:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         delayed:
 *                           type: integer
 *       503:
 *         description: MongoDB is disconnected
 */
router.get('/', async (_req, res) => {
  const mongoStatus =
    mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  let redisStatus = 'disabled';
  const redis = isRedisEnabled() ? getRedisConnection() : null;
  if (redis) {
    try {
      const pong = await redis.ping();
      redisStatus = pong === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      redisStatus = 'disconnected';
    }
  }

  let queueDepth = null;
  try {
    const queue = getUploadQueue();
    if (queue) {
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
      queueDepth = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        delayed: counts.delayed || 0,
      };
    }
  } catch {
    /* queue may not be available */
  }

  const healthy = mongoStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
      queue: queueDepth,
    },
  });
});

module.exports = router;
