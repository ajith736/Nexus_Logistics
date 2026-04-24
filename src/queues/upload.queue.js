const { Queue } = require('bullmq');
const { getRedisConnection, isRedisEnabled } = require('../config/redis');

const QUEUE_NAME = 'csv-upload';

let uploadQueue = null;

function getUploadQueue() {
  if (uploadQueue) return uploadQueue;
  if (!isRedisEnabled()) return null;

  const connection = getRedisConnection();
  if (!connection) return null;

  uploadQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 7 * 24 * 3600 },
      removeOnFail: { age: 14 * 24 * 3600 },
    },
  });

  return uploadQueue;
}

module.exports = { getUploadQueue, QUEUE_NAME };
