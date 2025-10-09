const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: "super_admin",
  },
  action: {
    type: String,
    required: true,
    enum: ["Create", "Update", "Delete", "Approve", "Post", "Block", "Unblock"],
  },
  entity: {
    type: String,
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  reason: String,
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
