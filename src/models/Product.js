const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["Sublimation", "Butter", "Other"],
      required: true,
    },
    gsm: { type: Number, required: true, enum: [30, 35, 45, 55, 65, 80] },
    quality_name: { type: String, required: true },
    quality_aliases: [{ type: String }],
    active: { type: Boolean, default: true },
    hsn_code: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = mongoose.model("Product", ProductSchema);
