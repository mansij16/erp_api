const mongoose = require("mongoose");

const customerRateSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // All rates are stored as 44" benchmark
    baseRate44: {
      type: Number,
      required: true,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validTo: {
      type: Date,
      default: null, // null means currently active
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding active rates
customerRateSchema.index({
  customerId: 1,
  productId: 1,
  active: 1,
  validFrom: -1,
});

// Method to calculate rate for any width
customerRateSchema.methods.calculateRateForWidth = function (widthInches) {
  // Formula: rate = baseRate44 * (width / 44)
  const calculatedRate = this.baseRate44 * (widthInches / 44);
  return Math.round(calculatedRate); // Round to nearest rupee
};

module.exports = mongoose.model("CustomerRate", customerRateSchema);
