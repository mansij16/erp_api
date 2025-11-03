const mongoose = require("mongoose");

const skuSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    widthInches: {
      type: Number,
      required: [true, "Width is required"],
      enum: [24, 36, 44, 63], // Fixed widths as per PRD
    },
    defaultLengthMeters: {
      type: Number,
      required: [true, "Default length is required"],
      default: 1000,
      enum: [1000, 1500, 2000], // Can have custom lengths too
    },
    skuCode: {
      type: String,
      unique: true,
      required: true,
    },
    taxRate: {
      type: Number,
      default: 18,
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
skuSchema.index({ productId: 1, widthInches: 1 }, { unique: true });
skuSchema.index({ skuCode: 1 });
skuSchema.index({ active: 1 });

// Virtual to populate product details
skuSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("SKU", skuSchema);
