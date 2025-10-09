const express = require("express");
const router = express.Router();
const { getVouchers } = require("../controllers/voucherController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getVouchers);

module.exports = router;
