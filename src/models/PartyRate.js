const mongoose = require("mongoose");

const PartyRateSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  base_rate_44: { type: Number, required: true },
  valid_from: { type: Date, default: Date.now },
  valid_to: { type: Date },
});

module.exports = mongoose.model("PartyRate", PartyRateSchema);
