const mongoose = require("mongoose");
const { PAYMENT_MODES, STATUS } = require("../config/constants");

const paymentAllocationSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceType: {
    type: String,
    enum: ["SalesInvoice", "PurchaseInvoice", "DebitNote", "CreditNote"],
    required: true,
  },
  allocatedAmount: {
    type: Number,
    required: true,
  },
});

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    partyName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Receipt", "Payment"],
      required: true,
    },
    mode: {
      type: String,
      enum: PAYMENT_MODES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    referenceNumber: String,
    bankAccount: String,
    remarks: String,
    allocations: [paymentAllocationSchema],
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
    },
    status: {
      type: String,
      enum: [STATUS.DRAFT, STATUS.POSTED],
      default: STATUS.DRAFT,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ supplierId: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
