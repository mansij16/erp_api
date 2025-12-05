const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      unique: true,
      uppercase: true,
      required: [true, "Supplier code is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    gstin: {
      type: String,
      required: [true, "GSTIN is required"],
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GSTIN format",
      ],
    },
    pan: {
      type: String,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },
    state: {
      type: String,
      required: true,
    },
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    contactPersons: [
      {
        name: { type: String, required: true },
        designation: String,
        phone: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branch: String,
      ifscCode: String,
    },
    paymentTerms: {
      creditDays: {
        type: Number,
        default: 30,
        min: 0,
      },
      creditLimit: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    leadTime: {
      type: Number, // in days
      default: 7,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    preferredSupplier: {
      type: Boolean,
      default: false,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    notes: String,
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

// Indexes
supplierSchema.index({ supplierCode: 1 });
supplierSchema.index({ gstin: 1 });
supplierSchema.index({ active: 1 });
supplierSchema.index({ preferredSupplier: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
