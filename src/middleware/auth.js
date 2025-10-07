const jwt = require("jsonwebtoken");
const User = require("../models/User");

const jwtSecret = process.env.JWT_SECRET || "secret";

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.sub).select("-password");
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authorize =
  (roles = []) =>
  (req, res, next) => {
    // roles can be string or array
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.length) return next();
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    return next();
  };

module.exports = { authenticate, authorize };
