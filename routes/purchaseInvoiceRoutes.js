const express = require("express");
const router = express.Router();
const {
  getPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  allocateLandedCost,
  postPurchaseInvoice,
} = require("../controllers/purchaseInvoiceController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getPurchaseInvoices)
  .post(createPurchaseInvoice);

router.route("/:id")
  .get(getPurchaseInvoice);

router.post("/:id/allocate-landed-cost", allocateLandedCost);
router.post("/:id/post", postPurchaseInvoice);

module.exports = router;
