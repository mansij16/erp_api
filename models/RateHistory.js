const mongoose = require("mongoose");

const rateHistorySchema = new mongoose.Schema(
  {
    rateHistoryId: {
      type: Number,
      unique: true,
    },
    baseRateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseRate",
      required: [true, "Base rate is required"],
    },
    previousRate: {
      type: Number,
      required: [true, "Previous rate is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
rateHistorySchema.index({ rateHistoryId: 1 });
rateHistorySchema.index({ baseRateId: 1 });

// Auto-generate rateHistoryId
rateHistorySchema.pre("save", async function (next) {
  if (!this.rateHistoryId && this.isNew) {
    try {
      const lastDoc = await this.constructor
        .findOne()
        .sort({ rateHistoryId: -1 })
        .select("rateHistoryId");
      this.rateHistoryId = lastDoc ? lastDoc.rateHistoryId + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual to populate baseRate
rateHistorySchema.virtual("baseRate", {
  ref: "BaseRate",
  localField: "baseRateId",
  foreignField: "_id",
  justOne: true,
});

module.exports = mongoose.model("RateHistory", rateHistorySchema);
