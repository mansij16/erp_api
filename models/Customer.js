const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
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
    stateCode: {
      type: String,
      required: true,
      length: 2,
    },
    address: {
      billing: {
        line1: { type: String, required: true },
        line2: String,
        city: { type: String, required: true },
        pincode: { type: String, required: true },
      },
      shipping: [
        {
          label: String,
          line1: String,
          line2: String,
          city: String,
          pincode: String,
          isDefault: { type: Boolean, default: false },
        },
      ],
    },
    contactPersons: [
      {
        name: { type: String, required: true },
        designation: String,
        phone: { type: String, required: true },
        whatsapp: String,
        email: { type: String, lowercase: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    group: {
      type: String,
      enum: ["Cash", "Wholesale", "Big", "Regular"],
      default: "Regular",
    },
    referral: {
      source: String,
      name: String,
      contact: String,
      company: String,
      remarks: String,
    },
    businessInfo: {
      monthlyCapacity: Number,
      targetSalesMeters: Number,
      businessType: String,
    },
    creditPolicy: {
      creditLimit: {
        type: Number,
        default: 0,
        min: 0,
      },
      creditDays: {
        type: Number,
        default: 0,
        min: 0,
      },
      graceDays: {
        type: Number,
        default: 0,
        min: 0,
      },
      autoBlock: {
        type: Boolean,
        default: true,
      },
      blockRule: {
        type: String,
        enum: ["OVER_LIMIT", "OVER_DUE", "BOTH"],
        default: "BOTH",
      },
      currentExposure: {
        type: Number,
        default: 0,
      },
      isBlocked: {
        type: Boolean,
        default: false,
      },
      blockReason: String,
      blockedAt: Date,
      unblockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    whatsappConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        enum: ["English", "Hindi", "Gujarati"],
        default: "English",
      },
      optedIn: {
        type: Boolean,
        default: false,
      },
      optedInAt: Date,
      notifications: {
        orderConfirmation: { type: Boolean, default: true },
        dispatch: { type: Boolean, default: true },
        invoice: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        statement: { type: Boolean, default: true },
        dunning: { type: Boolean, default: true },
      },
    },
    notes: String,
    tags: [String],
    active: {
      type: Boolean,
      default: true,
    },
    onboardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    onboardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ code: 1 });
customerSchema.index({ gstin: 1 });
customerSchema.index({ group: 1 });
customerSchema.index({ active: 1 });
customerSchema.index({ "creditPolicy.isBlocked": 1 });
customerSchema.index({ name: "text", companyName: "text" });

// Generate customer code
customerSchema.pre("save", async function (next) {
  if (!this.code && this.isNew) {
    const prefix =
      this.group === "Cash"
        ? "CSH"
        : this.group === "Wholesale"
        ? "WHL"
        : this.group === "Big"
        ? "BIG"
        : "REG";

    const count = await this.constructor.countDocuments({
      group: this.group,
    });

    this.code = `${prefix}${(count + 1).toString().padStart(5, "0")}`;
  }
  next();
});

// Virtual for outstanding amount
customerSchema.virtual("outstandingAmount").get(function () {
  // This would be calculated from sales invoices and payments
  return this.creditPolicy.currentExposure;
});

module.exports = mongoose.model("Customer", customerSchema);
