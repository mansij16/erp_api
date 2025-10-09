const mongoose = require("mongoose");
const { LEDGER_GROUPS } = require("../config/constants");

const ledgerSchema = new mongoose.Schema(
  {
    ledgerCode: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Ledger name is required"],
    },
    group: {
      type: String,
      enum: LEDGER_GROUPS,
      required: [true, "Ledger group is required"],
    },
    subGroup: String,
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    isSystemLedger: {
      type: Boolean,
      default: false,
    },
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
ledgerSchema.index({ ledgerCode: 1 });
ledgerSchema.index({ group: 1 });
ledgerSchema.index({ active: 1 });

module.exports = mongoose.model("Ledger", ledgerSchema);
