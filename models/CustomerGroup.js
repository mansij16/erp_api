// models/CustomerGroup.js
const mongoose = require("mongoose");

const customerGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer group name is required"],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerGroupSchema.index({ name: 1 });
customerGroupSchema.index({ code: 1 });
customerGroupSchema.index({ active: 1 });

module.exports = mongoose.model("CustomerGroup", customerGroupSchema);

