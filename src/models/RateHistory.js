const mongoose = require("mongoose");

const RateHistorySchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  so_id: { type: mongoose.Schema.Types.ObjectId, ref: "SO" },
  si_id: { type: mongoose.Schema.Types.ObjectId, ref: "SI" },
  effective_rate_44: { type: Number },
  override: { type: Boolean, default: false },
  overridden_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: { type: String },
  at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RateHistory", RateHistorySchema);
