const mongoose = require("mongoose");

const rollSchema = new mongoose.Schema(
  {
    // SKU mapping - can be null initially (unmapped)
    skuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SKU",
      default: null, // Can be unmapped initially
    },

    // Batch and vendor traceability
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    // Physical attributes
    widthInches: {
      type: Number,
      required: true,
      enum: [24, 36, 44, 63],
    },
    originalLengthMeters: {
      type: Number,
      required: true,
      min: 1,
    },
    currentLengthMeters: {
      type: Number,
      required: true,
      min: 0,
    },

    // Status tracking
    status: {
      type: String,
      enum: [
        "Unmapped",
        "Mapped",
        "Allocated",
        "Dispatched",
        "Returned",
        "Scrap",
      ],
      default: "Unmapped",
      required: true,
    },

    // Cost tracking
    landedCostPerMeter: {
      type: Number,
      default: 0,
    },
    totalLandedCost: {
      type: Number,
      default: 0,
    },

    // Barcode - Format: YYMM-SUP-BATCH-SEQ-CHECK
    barcode: {
      type: String,
      unique: true,
      required: true,
    },
    qrPayload: {
      type: Object, // Will store complete QR data
    },

    // GRN reference
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
    },

    // For returned/partial rolls
    parentRollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Roll",
      default: null,
    },
    returnReason: String,

    // Timestamps for aging
    inwardedAt: {
      type: Date,
      default: Date.now,
    },
    mappedAt: Date,
    dispatchedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
rollSchema.index({ status: 1 });
rollSchema.index({ skuId: 1 });
rollSchema.index({ batchId: 1 });
rollSchema.index({ vendorId: 1 });
rollSchema.index({ barcode: 1 });
rollSchema.index({ status: 1, inwardedAt: 1 }); // For unmapped aging

// Generate barcode before saving
rollSchema.pre("save", async function (next) {
  if (!this.barcode && this.isNew) {
    const date = new Date();
    const yymm = `${date.getFullYear().toString().slice(-2)}${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    // Get supplier code (first 3 letters)
    const supplier = await mongoose.model("Supplier").findById(this.vendorId);
    const supCode =
      supplier.code || supplier.name.substring(0, 3).toUpperCase();

    // Get batch code
    const batch = await mongoose.model("Batch").findById(this.batchId);
    const batchCode = batch.batchCode.substring(0, 4);

    // Generate sequence
    const count = await this.constructor.countDocuments({
      batchId: this.batchId,
    });
    const seq = (count + 1).toString().padStart(4, "0");

    // Generate check digit (simple modulo 10)
    const baseCode = `${yymm}-${supCode}-${batchCode}-${seq}`;
    const checkDigit =
      baseCode.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      10;

    this.barcode = `${baseCode}-${checkDigit}`;

    // Generate QR payload
    this.qrPayload = {
      roll_id: this._id,
      sku_id: this.skuId,
      batch_id: this.batchId,
      vendor_id: this.vendorId,
      width_in: this.widthInches,
      length_m: this.currentLengthMeters,
      landed_cost: this.totalLandedCost,
    };
  }

  // Calculate total landed cost
  if (this.landedCostPerMeter && this.currentLengthMeters) {
    this.totalLandedCost = this.landedCostPerMeter * this.currentLengthMeters;
  }

  next();
});

module.exports = mongoose.model("Roll", rollSchema);
