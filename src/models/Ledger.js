const mongoose = require("mongoose");

const LedgerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  group: { type: String, required: true }, // Assets, Liabilities, Income, Expenses, Equity
  code: { type: String },
  balance: { type: Number, default: 0 },
});

module.exports = mongoose.model("Ledger", LedgerSchema);
