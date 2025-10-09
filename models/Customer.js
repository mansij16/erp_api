const mongoose = require("mongoose");

const contactPersonSchema = new mongoose.Schema({
  name: String,
  phones: [String],
  email: String,
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

const referralSourceSchema = new mongoose.Schema({
  referralName: String,
  contactNumber: String,
  companyName: String,
  remark: String,
});

const creditPolicySchema = new mongoose.Schema({
  creditLimit: {
    type: Number,
    default: 0,
  },
  creditDays: {
    type: Number,
    default: 0,
  },
  graceDays: {
    type: Number,
    default: 0,
  },
  autoBlock: {
    type: Boolean,
    default: false,
  },
  blockRule: {
    type: String,
    enum: ["OVER_LIMIT", "OVER_DUE", "BOTH"],
    default: "BOTH",
  },
});

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    groups: [
      {
        type: String,
        enum: ["Cash", "Wholesale", "Big"],
      },
    ],
    contactPersons: [contactPersonSchema],
    referralSource: referralSourceSchema,
    monthlyCapacity: {
      targetSalesMeters: Number,
    },
    creditPolicy: creditPolicySchema,
    baseRate44: {
      type: Number,
      required: [true, 'Base rate for 44" is required'],
    },
    rateValidFrom: {
      type: Date,
      default: Date.now,
    },
    rateValidTo: Date,
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: String,
    blockedAt: Date,
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
customerSchema.index({ customerCode: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ active: 1 });
customerSchema.index({ groups: 1 });
customerSchema.index({ isBlocked: 1 });

module.exports = mongoose.model("Customer", customerSchema);
