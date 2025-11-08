// models/Quality.js
const mongoose = require("mongoose");

const qualitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Quality name is required"],
      unique: true,
      trim: true,
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

qualitySchema.index({ name: 1 });
qualitySchema.index({ active: 1 });

module.exports = mongoose.model("Quality", qualitySchema);

