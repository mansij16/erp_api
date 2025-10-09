const mongoose = require("mongoose");
const { ROLL_STATUS } = require("../config/constants");

const rollSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      unique: true,
      required: true,
    },
    skuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SKU",
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    categoryName: String,
    gsm: Number,
    qualityName: String,
    widthInches: Number,
    lengthMeters: Number,
    status: {
      type: String,
      enum: Object.values(ROLL_STATUS),
      default: ROLL_STATUS.UNMAPPED,
    },
    landedCostPerRoll: {
      type: Number,
      default: 0,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
    },
    purchaseInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseInvoice",
    },
    allocatedToSOId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    dispatchedInDCId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChallan",
    },
    billedInSIId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesInvoice",
    },
    mappedAt: Date,
    allocatedAt: Date,
    dispatchedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
rollSchema.index({ rollNumber: 1 });
rollSchema.index({ status: 1 });
rollSchema.index({ skuId: 1 });
rollSchema.index({ batchId: 1 });
rollSchema.index({ supplierId: 1 });

module.exports = mongoose.model("Roll", rollSchema);
