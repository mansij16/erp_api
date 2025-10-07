const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const salesController = require("../controllers/sales.controller");

const router = express.Router();

router.post(
  "/so",
  authenticate,
  authorize(["sales_manager", "sales_exec", "admin", "super_admin"]),
  salesController.createSO
);
router.post(
  "/so/:id/confirm",
  authenticate,
  authorize(["sales_manager", "admin", "super_admin"]),
  salesController.confirmSO
);
router.post(
  "/si",
  authenticate,
  authorize(["sales_manager", "accountant", "admin", "super_admin"]),
  salesController.createSI
);

module.exports = router;
