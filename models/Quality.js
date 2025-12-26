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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

qualitySchema.index({ name: 1 });
qualitySchema.index({ active: 1 });

// Provide a stable primary key field for consumers that expect `id`
qualitySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model("Quality", qualitySchema);

