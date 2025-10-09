const express = require("express");
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  closePurchaseOrder,
} = require("../controllers/purchaseOrderController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.route("/:id")
  .get(getPurchaseOrder)
  .put(updatePurchaseOrder);

router.post("/:id/approve", approvePurchaseOrder);
router.post("/:id/close", closePurchaseOrder);

module.exports = router;
