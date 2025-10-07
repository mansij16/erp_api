const mongoose = require("mongoose");

const SOLineSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: "SKU", required: true },
  width_in: { type: Number, required: true },
  length_m_per_roll: { type: Number, required: true },
  qty_rolls: { type: Number, required: true },
  derived_rate_per_roll: { type: Number, required: true },
  override_rate_per_roll: { type: Number },
  tax_rate: {
    type: Number,
    default: Number(process.env.DEFAULT_TAX_RATE || 18),
  },
  allocated_rolls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Roll" }],
});

const SOSchema = new mongoose.Schema({
  so_no: { type: String, required: true, unique: true },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: [
      "Draft",
      "Confirmed",
      "OnHold",
      "PartiallyFulfilled",
      "Closed",
      "Cancelled",
    ],
    default: "Draft",
  },
  lines: [SOLineSchema],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SO", SOSchema);
