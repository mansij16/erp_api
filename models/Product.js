// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    gsm: {
      type: Number,
      required: [true, "GSM is required"],
      min: 1,
      index: true,
    },
    qualityName: {
      type: String,
      required: [true, "Quality name is required"],
      trim: true,
      index: true,
    },
    productCode: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    hsnCode: {
      type: String,
      required: [true, "HSN code is required"],
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure unique combination of categoryId + gsm + qualityName
productSchema.index({ categoryId: 1, gsm: 1, qualityName: 1 }, { unique: true });

// Virtual to populate category via categoryId
productSchema.virtual("category", {
  ref: "Category",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("Product", productSchema);
