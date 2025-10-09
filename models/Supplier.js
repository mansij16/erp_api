const mongoose = require("mongoose");

const contactPersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: String,
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Supplier name is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    contactPersons: [contactPersonSchema],
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
supplierSchema.index({ supplierCode: 1 });
supplierSchema.index({ name: 1 });
supplierSchema.index({ active: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
