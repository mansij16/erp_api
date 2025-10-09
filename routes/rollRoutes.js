const express = require("express");
const router = express.Router();
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getRolls = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Roll module - implementation pending",
  });
});

router.route("/")
  .get(getRolls);

module.exports = router;
