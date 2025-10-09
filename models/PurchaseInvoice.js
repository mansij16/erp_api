const mongoose = require("mongoose");
const { STATUS } = require("../config/constants");

const landedCostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Freight", "Duty", "Clearing", "Misc"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  allocationBasis: {
    type: String,
    enum: ["ROLL", "METER", "VALUE"],
    required: true,
  },
  description: String,
});

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    piNumber: {
      type: String,
      unique: true,
      required: true,
    },
    supplierInvoiceNumber: String,
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    dueDate: Date,
    lines: [
      {
        poLineId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PurchaseOrder.lines",
        },
        skuId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SKU",
        },
        qtyRolls: Number,
        ratePerRoll: Number,
        taxRate: {
          type: Number,
          default: 18,
        },
        lineTotal: Number,
      },
    ],
    subtotal: Number,
    taxAmount: Number,
    total: Number,
    landedCosts: [landedCostSchema],
    totalLandedCost: Number,
    grandTotal: Number,
    status: {
      type: String,
      enum: [STATUS.DRAFT, STATUS.POSTED, STATUS.PAID],
      default: STATUS.DRAFT,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "PartiallyPaid", "Paid"],
      default: "Unpaid",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
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
purchaseInvoiceSchema.index({ piNumber: 1 });
purchaseInvoiceSchema.index({ supplierInvoiceNumber: 1 });
purchaseInvoiceSchema.index({ purchaseOrderId: 1 });
purchaseInvoiceSchema.index({ supplierId: 1 });
purchaseInvoiceSchema.index({ status: 1 });

module.exports = mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);
