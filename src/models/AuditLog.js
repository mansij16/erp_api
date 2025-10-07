const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String },
  entity: { type: String },
  entity_id: { type: mongoose.Schema.Types.ObjectId },
  before: { type: Object },
  after: { type: Object },
  reason: { type: String },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
