const mongoose = require("mongoose");

const skuSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    categoryName: {
      type: String,
      required: true,
    },
    gsm: {
      type: Number,
      required: true,
    },
    qualityName: {
      type: String,
      required: true,
    },
    widthInches: {
      type: Number,
      required: [true, "Width is required"],
      enum: [24, 36, 44, 63],
    },
    defaultLengthMeters: {
      type: Number,
      required: [true, "Default length is required"],
      enum: [1000, 1500, 2000],
    },
    taxRate: {
      type: Number,
      default: 18,
    },
    skuCode: {
      type: String,
      unique: true,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
skuSchema.index({ productId: 1 });
skuSchema.index({ skuCode: 1 });
skuSchema.index({ active: 1 });
// Removed compound unique index to allow multiple SKUs per product+width for different lengths
// skuSchema.index({ productId: 1, widthInches: 1 }, { unique: true });

// Generate SKU code before saving
skuSchema.pre("save", function (next) {
  if (!this.skuCode) {
    const cat = this.categoryName === "Sublimation" ? "SUB" : "BTR";
    const quality = this.qualityName.substring(0, 4).toUpperCase();
    this.skuCode = `${cat}-${this.gsm}-${quality}-${this.widthInches}-${this.defaultLengthMeters}`;
  }
  next();
});

module.exports = mongoose.model("SKU", skuSchema);
