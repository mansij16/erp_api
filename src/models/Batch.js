const mongoose = require("mongoose");

const BatchSchema = new mongoose.Schema({
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  batch_code: { type: String, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
});
BatchSchema.index({ supplier_id: 1, batch_code: 1 }, { unique: true });

module.exports = mongoose.model("Batch", BatchSchema);
