// models/GSM.js
const mongoose = require("mongoose");

const gsmSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "GSM name is required"],
      unique: true,
      trim: true,
    },
    value: {
      type: Number,
      required: [true, "GSM value is required"],
      unique: true,
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

gsmSchema.index({ name: 1 });
gsmSchema.index({ value: 1 });
gsmSchema.index({ active: 1 });

module.exports = mongoose.model("GSM", gsmSchema);

