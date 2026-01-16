const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      unique: true,
      uppercase: true,
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
    addressline1: {
      type: String,
      required: true,
    },
    addressline2: {
      type: String,
      required: true,
    },
    city: { type: String, required: true },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    pincode: { type: String, required: true },
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
supplierSchema.index({ "categoryRates.categoryId": 1 });

// Generate supplier code
supplierSchema.pre("save", async function (next) {
  if (!this.supplierCode && this.isNew) {
    try {
      const count = await this.constructor.countDocuments();
      this.supplierCode = `SUP${(count + 1).toString().padStart(5, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("Supplier", supplierSchema);
