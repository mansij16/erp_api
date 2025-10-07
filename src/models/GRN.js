const mongoose = require("mongoose");

const GRNLineSchema = new mongoose.Schema({
  po_line_id: { type: mongoose.Schema.Types.ObjectId },
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: "SKU" },
  received: { type: Number, required: true },
  accepted: { type: Number, default: 0 },
  rejected: { type: Number, default: 0 },
  unmapped: { type: Number, default: 0 },
});

const GRNSchema = new mongoose.Schema({
  grn_no: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  po_id: { type: mongoose.Schema.Types.ObjectId, ref: "PO" },
  status: { type: String, enum: ["Created", "Posted"], default: "Created" },
  lines: [GRNLineSchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GRN", GRNSchema);
