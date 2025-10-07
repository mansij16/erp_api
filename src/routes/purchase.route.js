const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const purchaseController = require("../controllers/purchase.controller");

const router = express.Router();

router.post(
  "/po",
  authenticate,
  authorize(["super_admin", "admin", "purchase_manager"]),
  purchaseController.createPO
);
router.post(
  "/po/:id/approve",
  authenticate,
  authorize(["super_admin", "admin", "purchase_manager"]),
  purchaseController.approvePO
);
router.post(
  "/pi",
  authenticate,
  authorize(["super_admin", "admin", "purchase_manager"]),
  purchaseController.createPI
);

module.exports = router;
