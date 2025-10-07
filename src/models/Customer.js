const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String },
  email: { type: String },
});

const CreditPolicySchema = new mongoose.Schema({
  credit_limit: { type: Number, default: 0 },
  credit_days: { type: Number, default: 0 },
  grace_days: { type: Number, default: 0 },
  auto_block: { type: Boolean, default: false },
  rule: {
    type: String,
    enum: ["OVER_LIMIT", "OVER_DUE", "BOTH"],
    default: "BOTH",
  },
});

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstin: { type: String },
  state: { type: String },
  address: { type: String },
  phone: { type: String },
  whatsapp: { type: String },
  groups: [{ type: String }], // Cash, Wholesale, Big
  contacts: [ContactSchema],
  referral_source: {
    name: String,
    contact: String,
    company: String,
    remark: String,
  },
  monthly_capacity: { type: Number, default: 0 },
  target_sales_mtrs: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  credit_policy: CreditPolicySchema,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Customer", CustomerSchema);
