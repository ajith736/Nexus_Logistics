const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  orgId: Joi.string().hex().length(24).required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  orgId: Joi.string().hex().length(24),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createUserSchema, updateUserSchema };
