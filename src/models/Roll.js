const mongoose = require("mongoose");

const RollSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: "SKU" }, // may be null if unmapped
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true,
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  width_in: { type: Number, required: true },
  length_m: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: [
      "Unmapped",
      "Mapped",
      "Allocated",
      "Dispatched",
      "Returned",
      "Scrap",
    ],
    default: "Unmapped",
  },
  landed_cost: { type: Number, default: 0 }, // per-roll landed cost
  barcode: { type: String, unique: true, sparse: true },
  qr_payload: { type: Object },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

RollSchema.pre("save", function setUpdated(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model("Roll", RollSchema);
