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
      default: null,
    },
    isSpecialRate: {
      type: Boolean,
      default: false,
    },
    specialRateReason: String,
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

// Indexes
customerRateSchema.index({
  customerId: 1,
  productId: 1,
  active: 1,
  validFrom: -1,
});
customerRateSchema.index({ customerId: 1, active: 1 });

// Methods
customerRateSchema.methods.calculateRateForWidth = function (widthInches) {
  const calculatedRate = this.baseRate44 * (widthInches / 44);
  return Math.round(calculatedRate);
};

customerRateSchema.statics.getActiveRate = async function (
  customerId,
  productId,
  date = new Date()
) {
  return this.findOne({
    customerId,
    productId,
    active: true,
    validFrom: { $lte: date },
    $or: [{ validTo: null }, { validTo: { $gte: date } }],
  }).sort({ validFrom: -1 });
};

module.exports = mongoose.model("CustomerRate", customerRateSchema);
