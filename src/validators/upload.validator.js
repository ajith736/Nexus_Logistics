const Joi = require('joi');
const { UPLOAD_STATUSES } = require('../utils/constants');

const uploadQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...Object.values(UPLOAD_STATUSES)).optional(),
});

module.exports = { uploadQuerySchema };
