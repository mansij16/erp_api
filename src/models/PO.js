const mongoose = require("mongoose");

const POLineSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: "SKU" },
  gsm: { type: Number },
  quality: { type: String },
  width: { type: Number },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  tax_rate: {
    type: Number,
    default: Number(process.env.DEFAULT_TAX_RATE || 18),
  },
  received_qty: { type: Number, default: 0 },
});

const POSchema = new mongoose.Schema({
  po_no: { type: String, required: true, unique: true },
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Draft", "Approved", "Closed", "PartiallyReceived", "Cancelled"],
    default: "Draft",
  },
  currency: { type: String, default: "INR" },
  lines: [POLineSchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PO", POSchema);
