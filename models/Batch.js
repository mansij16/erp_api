const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    batchCode: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

batchSchema.index({ supplierId: 1 });
batchSchema.index({ batchCode: 1 });

module.exports = mongoose.model("Batch", batchSchema);
