const Joi = require('joi');
const { ORDER_STATUSES } = require('../utils/constants');

const createOrderSchema = Joi.object({
  saleOrderId: Joi.string().trim().min(1).max(50).required(),
  customerName: Joi.string().trim().min(1).max(200).required(),
  customerPhone: Joi.string().trim().min(7).max(20).required(),
  customerAddress: Joi.string().trim().min(1).max(500).required(),
  packageDetails: Joi.string().trim().max(1000).allow('').default(''),
});

const assignAgentSchema = Joi.object({
  agentId: Joi.string().hex().length(24).required(),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      ORDER_STATUSES.OUT_FOR_DELIVERY,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.FAILED
    )
    .required(),
});

module.exports = { createOrderSchema, assignAgentSchema, updateOrderStatusSchema };
