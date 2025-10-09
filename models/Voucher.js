const mongoose = require("mongoose");
const { VOUCHER_TYPES, STATUS } = require("../config/constants");

const voucherLineSchema = new mongoose.Schema({
  ledgerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ledger",
    required: true,
  },
  ledgerName: {
    type: String,
    required: true,
  },
  debit: {
    type: Number,
    default: 0,
  },
  credit: {
    type: Number,
    default: 0,
  },
  description: String,
});

const voucherSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      unique: true,
      required: true,
    },
    voucherType: {
      type: String,
      enum: VOUCHER_TYPES,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    referenceType: {
      type: String,
      enum: ["PurchaseInvoice", "SalesInvoice", "Payment", "CreditNote", "DebitNote"],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceNumber: String,
    narration: String,
    lines: [voucherLineSchema],
    totalDebit: Number,
    totalCredit: Number,
    status: {
      type: String,
      enum: [STATUS.DRAFT, STATUS.POSTED],
      default: STATUS.DRAFT,
    },
    postedAt: Date,
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
voucherSchema.index({ voucherNumber: 1 });
voucherSchema.index({ voucherType: 1 });
voucherSchema.index({ date: 1 });
voucherSchema.index({ status: 1 });
voucherSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
