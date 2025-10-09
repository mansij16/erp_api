const mongoose = require("mongoose");
const { STATUS } = require("../config/constants");

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      unique: true,
      required: true,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    poNumber: {
      type: String,
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
      enum: [STATUS.DRAFT, STATUS.POSTED],
      default: STATUS.DRAFT,
    },
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
        qtyOrdered: Number,
        qtyReceived: Number,
        qtyAccepted: Number,
        qtyRejected: Number,
        qtyUnmapped: Number,
        rollsCreated: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Roll",
          },
        ],
      },
    ],
    notes: String,
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
grnSchema.index({ grnNumber: 1 });
grnSchema.index({ purchaseOrderId: 1 });
grnSchema.index({ supplierId: 1 });
grnSchema.index({ status: 1 });

module.exports = mongoose.model("GRN", grnSchema);
