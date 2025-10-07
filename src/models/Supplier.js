const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstin: { type: String },
  state: { type: String },
  address: { type: String },
  contact_name: { type: String },
  contact_phone: { type: String },
  contact_email: { type: String },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Supplier", SupplierSchema);
