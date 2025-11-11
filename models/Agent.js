// models/Agent.js
const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    agentCode: {
      type: String,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Agent name is required"],
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
        whatsapp: String,
        email: { type: String, lowercase: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    customers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
      },
    ],
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
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
agentSchema.index({ agentCode: 1 });
agentSchema.index({ gstin: 1 });
agentSchema.index({ customers: 1 });
agentSchema.index({ active: 1 });
agentSchema.index({ name: "text", companyName: "text" });

// Generate agent code
agentSchema.pre("save", async function (next) {
  if (!this.agentCode && this.isNew) {
    try {
      const count = await this.constructor.countDocuments();
      this.agentCode = `AGT${(count + 1).toString().padStart(5, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual to populate customers
agentSchema.virtual("customerList", {
  ref: "Customer",
  localField: "customers",
  foreignField: "_id",
  justOne: false,
});

module.exports = mongoose.model("Agent", agentSchema);

