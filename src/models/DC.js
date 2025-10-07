const mongoose = require("mongoose");

const DCLineSchema = new mongoose.Schema({
  so_line_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  roll_id: { type: mongoose.Schema.Types.ObjectId, ref: "Roll" },
  shipped_length_m: { type: Number },
  shipped_status: {
    type: String,
    enum: ["Open", "Shipped", "Partial"],
    default: "Open",
  },
});

const DCSchema = new mongoose.Schema({
  dc_no: { type: String, required: true, unique: true },
  so_id: { type: mongoose.Schema.Types.ObjectId, ref: "SO", required: true },
  dc_date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Open", "Closed"], default: "Open" },
  lines: [DCLineSchema],
});

module.exports = mongoose.model("DC", DCSchema);
