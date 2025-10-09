const express = require("express");
const router = express.Router();
const {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  confirmSalesOrder,
  calculatePricing,
} = require("../controllers/salesOrderController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getSalesOrders)
  .post(createSalesOrder);

router.route("/:id")
  .get(getSalesOrder);

router.post("/:id/confirm", confirmSalesOrder);
router.post("/calculate-pricing", calculatePricing);

module.exports = router;
