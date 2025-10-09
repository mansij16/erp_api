const express = require("express");
const router = express.Router();
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Placeholder controller - will be implemented later
const getReports = handleAsyncErrors(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Report module - implementation pending",
  });
});

router.route("/")
  .get(getReports);

module.exports = router;
