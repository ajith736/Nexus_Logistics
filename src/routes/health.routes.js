const { Router } = require('express');
const mongoose = require('mongoose');
const { getRedisConnection, isRedisEnabled } = require('../config/redis');
const { getUploadQueue } = require('../queues/upload.queue');

const router = Router();

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
