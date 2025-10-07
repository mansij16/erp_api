const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: [
      "super_admin",
      "admin",
      "purchase_manager",
      "sales_manager",
      "warehouse",
      "accountant",
      "customer",
    ],
    default: "sales_manager",
  },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" }, // for customers linked to a user
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

UserSchema.pre("save", async function hash(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function compare(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
