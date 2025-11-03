const express = require("express");
const router = express.Router();
const skuController = require("../controllers/skuController");
// const { validateSKU } = require("../validators/skuValidator");
// const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
// router.use(authenticate);

// Public routes
router.get("/", skuController.getAllSKUs);
router.get("/available", skuController.getAvailableSKUs);
router.get("/:id", skuController.getSKUById);
router.get("/code/:code", skuController.getSKUByCode);

// Admin only routes
// router.use(authorize(["admin", "super_admin", "inventory_manager"]));

router.post("/", skuController.createSKU);
router.post("/bulk", skuController.bulkCreateSKUs);
router.patch("/:id", skuController.updateSKU);
router.patch("/:id/toggle-status", skuController.toggleSKUStatus);
router.delete("/:id", skuController.deleteSKU);

module.exports = router;
