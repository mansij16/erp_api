const express = require("express");
const router = express.Router();
const { getSalesInvoices } = require("../controllers/salesInvoiceController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getSalesInvoices);

module.exports = router;
