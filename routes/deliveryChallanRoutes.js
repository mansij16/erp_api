const express = require("express");
const router = express.Router();
const { getDeliveryChallans } = require("../controllers/deliveryChallanController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getDeliveryChallans);

module.exports = router;
