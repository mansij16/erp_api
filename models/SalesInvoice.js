const mongoose = require("mongoose");
const { STATUS } = require("../config/constants");

const salesInvoiceLineSchema = new mongoose.Schema({
  soLineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalesOrder.lines",
  },
  rollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Roll",
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
  },
  skuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SKU",
  },
  categoryName: String,
  gsm: String,
  qualityName: String,
  widthInches: Number,
  qtyRolls: Number,
  billedLengthMeters: Number,
  ratePerRoll: Number,
  discountLine: {
    type: Number,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 18,
  },
  lineTotal: Number,
  landedCostPerRoll: Number,
  cogsAmount: Number,
});

const salesInvoiceSchema = new mongoose.Schema(
  {
    siNumber: {
      type: String,
      unique: true,
      required: true,
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },
    deliveryChallanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChallan",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    siDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: Date,
    status: {
      type: String,
      enum: [STATUS.DRAFT, STATUS.POSTED],
      default: STATUS.DRAFT,
    },
    lines: [salesInvoiceLineSchema],
    subtotal: Number,
    discountTotal: {
      type: Number,
      default: 0,
    },
    taxAmount: Number,
    total: Number,
    totalCOGS: Number,
    grossMargin: Number,
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "PartiallyPaid", "Paid"],
      default: "Unpaid",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    outstandingAmount: Number,
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
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
salesInvoiceSchema.index({ siNumber: 1 });
salesInvoiceSchema.index({ salesOrderId: 1 });
salesInvoiceSchema.index({ customerId: 1 });
salesInvoiceSchema.index({ status: 1 });

module.exports = mongoose.model("SalesInvoice", salesInvoiceSchema);
