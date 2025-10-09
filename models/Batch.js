const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      unique: true,
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
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

// Indexes
batchSchema.index({ batchCode: 1 });
batchSchema.index({ supplierId: 1 });
batchSchema.index({ date: -1 });

module.exports = mongoose.model("Batch", batchSchema);
