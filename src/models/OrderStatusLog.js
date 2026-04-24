const mongoose = require('mongoose');
const { ORDER_STATUSES, PERFORMER_MODELS } = require('../utils/constants');

const orderStatusLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    fromStatus: {
      type: String,
      enum: [...Object.values(ORDER_STATUSES), null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'changedByModel',
    },
    changedByModel: {
      type: String,
      required: true,
      enum: Object.values(PERFORMER_MODELS),
    },
  },
  { timestamps: true }
);

orderStatusLogSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model('OrderStatusLog', orderStatusLogSchema);
