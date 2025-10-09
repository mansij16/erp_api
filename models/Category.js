const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      enum: ["Sublimation", "Butter"],
      unique: true,
    },
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
categorySchema.index({ name: 1 });
categorySchema.index({ active: 1 });

module.exports = mongoose.model("Category", categorySchema);
