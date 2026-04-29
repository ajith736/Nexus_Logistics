const mongoose = require('mongoose');
const { UPLOAD_STATUSES } = require('../utils/constants');

const uploadJobSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UPLOAD_STATUSES),
      default: UPLOAD_STATUSES.QUEUED,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failCount: {
      type: Number,
      default: 0,
    },
    errorFileUrl: {
      type: String,
      default: null,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3'],
      default: 'local',
    },
    fileKey: {
      type: String,
      default: null,
    },
    errorFileKey: {
      type: String,
      default: null,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

uploadJobSchema.index({ orgId: 1, createdAt: -1 });

module.exports = mongoose.model('UploadJob', uploadJobSchema);
