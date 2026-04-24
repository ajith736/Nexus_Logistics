const Joi = require('joi');
const { ORG_STATUSES } = require('../utils/constants');

const createOrgSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});

const updateOrgSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  status: Joi.string().valid(...Object.values(ORG_STATUSES)),
}).min(1);

module.exports = { createOrgSchema, updateOrgSchema };
