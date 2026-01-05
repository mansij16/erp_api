const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    batchCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    purchaseInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseInvoice",
    },
    manufactureDate: Date,
    expiryDate: Date,
    totalRolls: {
      type: Number,
      default: 0,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

batchSchema.pre("save", async function (next) {
  if (!this.batchCode && this.isNew) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;

    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });

    this.batchCode = `B${dateStr}-${(count + 1).toString().padStart(3, "0")}`;
  }
  next();
});

batchSchema.index({ supplierId: 1 });
batchSchema.index({ batchCode: 1 });

module.exports = mongoose.model("Batch", batchSchema);
