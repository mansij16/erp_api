const mongoose = require("mongoose");
const { STATUS } = require("../config/constants");

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
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
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.DRAFT,
    },
    currency: {
      type: String,
      default: "INR",
    },
    lines: [
      {
        skuId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SKU",
        },
        categoryName: String,
        gsm: Number,
        qualityName: String,
        widthInches: Number,
        qtyRolls: Number,
        ratePerRoll: Number,
        taxRate: {
          type: Number,
          default: 18,
        },
        lineTotal: Number,
        receivedQty: {
          type: Number,
          default: 0,
        },
        invoicedQty: {
          type: Number,
          default: 0,
        },
      },
    ],
    subtotal: Number,
    taxAmount: Number,
    total: Number,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ date: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
