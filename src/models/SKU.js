const mongoose = require("mongoose");

const validWidths = [24, 36, 44, 63]; // extendable

const SKUSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  width_in: { type: Number, required: true },
  default_length_m: { type: Number, required: true, enum: [1000, 1500, 2000] },
  tax_rate: {
    type: Number,
    default: Number(process.env.DEFAULT_TAX_RATE || 18),
  }, // percent
  created_at: { type: Date, default: Date.now },
});

SKUSchema.index({ product_id: 1, width_in: 1 }, { unique: true });

SKUSchema.pre("validate", function (next) {
  if (!validWidths.includes(this.width_in)) {
    // allow custom widths but warn: in PRD widths are from set
    // for now allow, but can enforce
  }
  if (![1000, 1500, 2000].includes(this.default_length_m)) {
    // allow custom lengths but must be > 0
    if (this.default_length_m <= 0)
      return next(new Error("default_length_m must be positive"));
  }
  next();
});

module.exports = mongoose.model("SKU", SKUSchema);
