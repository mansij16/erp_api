const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  mode: { type: String, enum: ["Cash", "NEFT", "UPI", "Cheque", "RTGS"] },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  ref_no: { type: String },
  remarks: { type: String },
});

module.exports = mongoose.model("Payment", PaymentSchema);
