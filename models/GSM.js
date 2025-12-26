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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Provide a stable primary key field for consumers that expect `id`
gsmSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

gsmSchema.index({ name: 1 });
gsmSchema.index({ value: 1 });
gsmSchema.index({ active: 1 });

module.exports = mongoose.model("GSM", gsmSchema);

