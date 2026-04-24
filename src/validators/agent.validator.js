const Joi = require('joi');
const { AGENT_STATUSES } = require('../utils/constants');

const createAgentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(7).max(20).required(),
  pin: Joi.string().length(4).pattern(/^\d{4}$/).required()
    .messages({ 'string.pattern.base': 'PIN must be exactly 4 digits' }),
});

const updateAgentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().min(7).max(20),
  pin: Joi.string().length(4).pattern(/^\d{4}$/)
    .messages({ 'string.pattern.base': 'PIN must be exactly 4 digits' }),
}).min(1);

const updateAgentStatusSchema = Joi.object({
  status: Joi.string()
    .valid(AGENT_STATUSES.AVAILABLE, AGENT_STATUSES.UNAVAILABLE)
    .required(),
});

module.exports = { createAgentSchema, updateAgentSchema, updateAgentStatusSchema };
