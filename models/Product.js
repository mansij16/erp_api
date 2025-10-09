const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    categoryName: {
      type: String,
      required: true,
    },
    gsm: {
      type: Number,
      required: [true, "GSM is required"],
      enum: [30, 35, 45, 55, 65, 80],
    },
    qualityName: {
      type: String,
      required: [true, "Quality name is required"],
      enum: ["Premium", "Standard", "Economy", "Custom"],
    },
    qualityAliases: [
      {
        type: String,
      },
    ],
    hsnCode: {
      type: String,
      required: [true, "HSN code is required"],
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
productSchema.index({ categoryId: 1 });
productSchema.index({ gsm: 1 });
productSchema.index({ active: 1 });
productSchema.index({ categoryName: 1, gsm: 1 });

// Unique compound index
productSchema.index(
  { categoryId: 1, gsm: 1, qualityName: 1 },
  { unique: true }
);

module.exports = mongoose.model("Product", productSchema);
