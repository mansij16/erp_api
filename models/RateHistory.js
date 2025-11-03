const mongoose = require("mongoose");

const rateHistorySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    soId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    siId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesInvoice",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    effectiveRate44: {
      type: Number,
      required: true,
    },
    appliedWidth: Number,
    appliedRate: Number, // Actual rate after width calculation
    isOverride: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    overrideReason: String,
    isSpecialDeal: {
      type: Boolean,
      default: false,
    },
    dealNotes: String,
  },
  {
    timestamps: true,
  }
);

rateHistorySchema.index({ customerId: 1, createdAt: -1 });
rateHistorySchema.index({ soId: 1 });
rateHistorySchema.index({ siId: 1 });

module.exports = mongoose.model("RateHistory", rateHistorySchema);
