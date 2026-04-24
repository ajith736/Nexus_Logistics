const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../utils/constants');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    saleOrderId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.CREATED,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerAddress: {
      type: String,
      required: true,
      trim: true,
    },
    packageDetails: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    uploadJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UploadJob',
      default: null,
    },
    dedupeHash: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ orgId: 1, saleOrderId: 1 }, { unique: true });
orderSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
