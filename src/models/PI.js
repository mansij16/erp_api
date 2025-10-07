const mongoose = require("mongoose");

const PILineSchema = new mongoose.Schema({
  po_line_id: { type: mongoose.Schema.Types.ObjectId },
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: "SKU" },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  tax_rate: {
    type: Number,
    default: Number(process.env.DEFAULT_TAX_RATE || 18),
  },
});

const PISchema = new mongoose.Schema({
  pi_no: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  po_id: { type: mongoose.Schema.Types.ObjectId, ref: "PO" },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  gst_type: { type: String, enum: ["IGST", "CGST_SGST"], default: "CGST_SGST" },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  lines: [PILineSchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PI", PISchema);
