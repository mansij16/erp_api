const express = require("express");
const router = express.Router();
const {
  getSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  postSalesInvoice,
} = require("../controllers/salesInvoiceController");

// All routes require authentication
// TODO: Add authentication middleware

router
  .route("/")
  .get(getSalesInvoices)
  .post(createSalesInvoice);

router.route("/:id").get(getSalesInvoice);
router.route("/:id/post").post(postSalesInvoice);

module.exports = router;
