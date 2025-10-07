const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const rollController = require("../controllers/roll.controller");

const router = express.Router();

router.get("/", authenticate, rollController.listRolls);
router.get("/:id", authenticate, rollController.getRoll);
router.post(
  "/:id/map",
  authenticate,
  authorize(["warehouse", "purchase_manager", "admin", "super_admin"]),
  rollController.mapRollToSKU
);
router.post(
  "/bulk-map",
  authenticate,
  authorize(["warehouse", "purchase_manager", "admin", "super_admin"]),
  rollController.bulkMap
);

module.exports = router;
