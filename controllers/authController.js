const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

const sanitizeUser = (user) => {
  const obj = user.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

// Register new user (default Admin) — requires full address per model
const register = handleAsyncErrors(async (req, res) => {
  const {
    username,
    email,
    password,
    role = "Admin",
    address = {},
    state,
    country,
  } = req.body;

  if (!username || !email || !password) {
    throw new AppError("Username, email and password are required", 400);
  }

  // Simple role guard to allowed enum
  const allowedRoles = [
    "SuperAdmin",
    "Admin",
    "PurchaseManager",
    "SalesManager",
    "SalesExec",
    "WarehouseStaff",
    "Accountant",
  ];
  if (!allowedRoles.includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const addressPayload = {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    pincode: address.pincode,
  };

  if (!addressPayload.line1 || !addressPayload.city || !addressPayload.pincode) {
    throw new AppError(
      "Address line1, city and pincode are required",
      400
    );
  }

  if (!state || !country) {
    throw new AppError("State and country are required", 400);
  }

  const user = await User.create({
    username,
    email,
    password,
    role,
    address: addressPayload,
    state,
    country,
  });

  const token = signToken(user);

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

// Login with username or email
const login = handleAsyncErrors(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new AppError("Identifier and password are required", 400);
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  }).select("+password");

  if (!user || !(await user.correctPassword(password))) {
    throw new AppError("Invalid credentials", 401);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

module.exports = {
  register,
  login,
};
