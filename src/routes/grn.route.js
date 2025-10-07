const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const grnController = require("../controllers/grn.controller");

const router = express.Router();

// GRN CRUD operations
router.post(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "warehouse"]),
  grnController.createGRN
);

router.get(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "warehouse", "accountant"]),
  grnController.listGRNs
);

router.get(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "warehouse", "accountant"]),
  grnController.getGRN
);

router.put(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "warehouse"]),
  grnController.updateGRN
);

router.post(
  "/:id/approve",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  grnController.approveGRN
);

router.post(
  "/:id/reject",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  grnController.rejectGRN
);

router.post(
  "/:id/receive-rolls",
  authenticate,
  authorize(["admin", "super_admin", "warehouse"]),
  grnController.receiveRolls
);

router.post(
  "/:id/quality-check",
  authenticate,
  authorize(["admin", "super_admin", "quality_check"]),
  grnController.recordQualityCheck
);

router.get(
  "/:id/rolls",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "warehouse"]),
  grnController.getGRNRolls
);

module.exports = router;