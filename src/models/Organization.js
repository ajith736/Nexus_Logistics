const mongoose = require('mongoose');
const { ORG_STATUSES } = require('../utils/constants');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ORG_STATUSES),
      default: ORG_STATUSES.ACTIVE,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
