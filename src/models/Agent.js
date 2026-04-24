const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { AGENT_STATUSES } = require('../utils/constants');

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: Object.values(AGENT_STATUSES),
      default: AGENT_STATUSES.AVAILABLE,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

agentSchema.index({ orgId: 1, phone: 1 }, { unique: true });
agentSchema.index({ orgId: 1, status: 1 });

agentSchema.pre('save', async function () {
  if (!this.isModified('pin')) return;
  this.pin = await bcrypt.hash(this.pin, 10);
});

agentSchema.methods.comparePin = async function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

module.exports = mongoose.model('Agent', agentSchema);
