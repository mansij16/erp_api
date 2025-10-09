const express = require("express");
const router = express.Router();
const { getPayments } = require("../controllers/paymentController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getPayments);

module.exports = router;
