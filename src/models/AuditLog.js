const mongoose = require('mongoose');
const { PERFORMER_MODELS } = require('../utils/constants');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'performedByModel',
    },
    performedByModel: {
      type: String,
      required: true,
      enum: Object.values(PERFORMER_MODELS),
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ orgId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
