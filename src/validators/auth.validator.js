const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const agentLoginSchema = Joi.object({
  phone: Joi.string().required(),
  pin: Joi.string().length(4).required(),
  orgSlug: Joi.string().required(),
});

module.exports = {
  loginSchema,
  refreshTokenSchema,
  agentLoginSchema,
};
