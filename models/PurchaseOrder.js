const mongoose = require("mongoose");
const { PURCHASE_ORDER_STATUS } = require("../config/constants");

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
    poStatus: {
      type: String,
      enum: Object.values(PURCHASE_ORDER_STATUS),
      default: PURCHASE_ORDER_STATUS.DRAFT,
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
        lineStatus: {
          type: String,
          enum: ["Pending", "Complete"],
          default: "Pending",
        },
        categoryName: String,
        gsm: String,
        qualityName: String,
        widthInches: Number,
        lengthMetersPerRoll: {
          type: Number,
          default: 0,
        },
        qtyRolls: Number,
        totalMeters: {
          type: Number,
          default: 0,
        },
        ratePerRoll: Number,
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
    totalAmount: Number,
    totalMeters: {
      type: Number,
      default: 0,
    },
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
