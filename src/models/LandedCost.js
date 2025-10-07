const mongoose = require("mongoose");

const LandedCostSchema = new mongoose.Schema(
  {
    pi_id: { type: mongoose.Schema.Types.ObjectId, ref: "PI", required: true },
    type: {
      type: String,
      enum: ["Freight", "Duty", "Clearing", "Misc", "GST"],
      required: true,
    },
    basis: { type: String, enum: ["ROLL", "METER", "VALUE"], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LandedCost", LandedCostSchema);
