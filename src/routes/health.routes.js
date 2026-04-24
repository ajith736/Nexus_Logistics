const { Router } = require('express');
const mongoose = require('mongoose');
const { getRedisConnection, isRedisEnabled } = require('../config/redis');

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

  const healthy = mongoStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
    },
  });
});

module.exports = router;
