const IORedis = require('ioredis');

let connection = null;
let lastWarnedError = null;

function isRedisEnabled() {
  const v = (process.env.REDIS_ENABLED || '').toLowerCase();
  if (!v) return true;
  return v !== 'false' && v !== '0' && v !== 'no' && v !== 'off';
}

/**
 * Returns a shared IORedis client, or null when REDIS_ENABLED=false.
 * Uses lazy connect + limited retries so a missing local Redis does not flood the console.
 */
function getRedisConnection() {
  if (!isRedisEnabled()) return null;

  if (connection) return connection;

  connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: String(process.env.REDIS_TLS || '').toLowerCase() === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 8) return null;
      return Math.min(times * 300, 2000);
    },
  });

  connection.on('connect', () => {
    console.log('Redis connected');
    lastWarnedError = null;
  });

  connection.on('error', (err) => {
    if (lastWarnedError !== err.message) {
      lastWarnedError = err.message;
      console.warn(
        'Redis unavailable (queues disabled until Redis runs). Install Memurai/Docker Redis or set REDIS_ENABLED=false in .env:',
        err.message
      );
    }
  });

  return connection;
}

module.exports = { getRedisConnection, isRedisEnabled };
