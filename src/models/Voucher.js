const mongoose = require("mongoose");

const VoucherLineSchema = new mongoose.Schema({
  ledger_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ledger",
    required: true,
  },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  ref_entity: { type: mongoose.Schema.Types.ObjectId }, // link to SI, PI, Payment etc
});

const VoucherSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "Payment",
      "Receipt",
      "Contra",
      "Journal",
      "Sales",
      "Purchase",
      "DebitNote",
      "CreditNote",
    ],
    required: true,
  },
  lines: [VoucherLineSchema],
  date: { type: Date, default: Date.now },
  narration: { type: String },
  status: { type: String, enum: ["Draft", "Posted"], default: "Draft" },
});

module.exports = mongoose.model("Voucher", VoucherSchema);
