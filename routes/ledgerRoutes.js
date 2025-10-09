const express = require("express");
const router = express.Router();
const { getLedgers } = require("../controllers/ledgerController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getLedgers);

module.exports = router;
