const mongoose = require("mongoose");

const SILineSchema = new mongoose.Schema({
  so_line_id: { type: mongoose.Schema.Types.ObjectId },
  roll_id: { type: mongoose.Schema.Types.ObjectId, ref: "Roll" },
  qty_rolls: { type: Number },
  billed_length_m: { type: Number },
  rate_per_roll: { type: Number, required: true },
  discount_line: { type: Number, default: 0 },
  tax_rate: {
    type: Number,
    default: Number(process.env.DEFAULT_TAX_RATE || 18),
  },
  line_total: { type: Number, default: 0 },
});

const SISchema = new mongoose.Schema({
  si_no: { type: String, required: true, unique: true },
  so_id: { type: mongoose.Schema.Types.ObjectId, ref: "SO" },
  dc_id: { type: mongoose.Schema.Types.ObjectId, ref: "DC" },
  si_date: { type: Date, default: Date.now },
  gst_type: { type: String, enum: ["IGST", "CGST_SGST"], default: "CGST_SGST" },
  subtotal: { type: Number, default: 0 },
  discount_total: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ["Draft", "Posted"], default: "Draft" },
  lines: [SILineSchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SI", SISchema);
