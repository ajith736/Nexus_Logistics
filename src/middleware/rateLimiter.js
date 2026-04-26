const rateLimit = require('express-rate-limit');

function rateLimitBody(message) {
  return {
    success: false,
    message,
    errorCode: 'RATE_LIMIT',
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitBody('Too many attempts, please try again after 15 minutes'),
});

/** Baseline for all /api routes except health (probes must not 429). */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitBody('Too many requests, please try again later'),
  skip: (req) => {
    const pathOnly = (req.originalUrl || '').split('?')[0];
    return pathOnly === '/api/health' || pathOnly.startsWith('/api/health/');
  },
});

/** CSV uploads: disk, Multer, Redis queue — cap per authenticated user. */
const uploadCsvLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitBody('Too many file uploads, please try again in a few minutes'),
  keyGenerator: (req) => (req.user?.id ? String(req.user.id) : req.ip),
});

/** Bulk assign touches many orders per request — tighter than general API. */
const bulkAssignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitBody('Too many bulk assign requests, please try again later'),
  keyGenerator: (req) => (req.user?.id ? String(req.user.id) : req.ip),
});

module.exports = {
  authLimiter,
  generalLimiter,
  uploadCsvLimiter,
  bulkAssignLimiter,
};
