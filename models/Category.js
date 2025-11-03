// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      enum: ["Sublimation", "Butter"],
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ["SUB", "BTR"],
      uppercase: true,
    },
    hsnCode: {
      type: String,
      required: [true, "HSN code is required"],
    },
    defaultTaxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
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

categorySchema.index({ name: 1 });
categorySchema.index({ code: 1 });
categorySchema.index({ active: 1 });

module.exports = mongoose.model("Category", categorySchema);
