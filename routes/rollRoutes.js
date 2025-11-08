const express = require("express");
const router = express.Router();
const rollController = require("../controllers/rollController");
// const { authenticate, authorize } = require("../middlewares/auth");

// router.use(authenticate);

// Public routes
router.get("/", rollController.getAllRolls);
router.get("/summary", rollController.getInventorySummary);
router.get("/unmapped", rollController.getUnmappedRolls);
router.get("/barcode/:barcode", rollController.getRollByBarcode);

// Warehouse staff routes
// router.use(authorize(["admin", "warehouse_staff", "inventory_manager"]));

router.post("/map", rollController.mapUnmappedRolls);
router.post("/allocate", rollController.allocateRolls);
router.post("/deallocate", rollController.deallocateRolls);
router.post("/dispatch", rollController.dispatchRolls);
router.post("/return", rollController.handleReturn);
router.patch("/:id/scrap", rollController.markAsScrap);

module.exports = router;
