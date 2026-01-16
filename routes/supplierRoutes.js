const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
// const { authenticate, authorize } = require("../middlewares/auth");

// router.use(authenticate);

// Public routes
router.get("/", supplierController.getAllSuppliers);
router.get("/next-code", supplierController.getNextSupplierCode);
router.get("/:id", supplierController.getSupplierById);
router.get("/code/:code", supplierController.getSupplierByCode);

// Base Rate routes
router.get("/:id/base-rates", supplierController.getSupplierBaseRates);
router.post("/:id/base-rates", supplierController.upsertSupplierBaseRate);
router.post("/:id/base-rates/bulk", supplierController.bulkUpsertSupplierBaseRates);
router.delete("/:id/base-rates/:baseRateId", supplierController.deleteSupplierBaseRate);
router.get("/:id/base-rates/:baseRateId/history", supplierController.getSupplierBaseRateHistory);
router.get("/:id/rate-history", supplierController.getAllSupplierRateHistory);

// Admin/Manager routes
// router.use(authorize(["admin", "super_admin", "purchase_manager"]));

router.post("/", supplierController.createSupplier);
router.patch("/:id", supplierController.updateSupplier);
router.patch("/:id/toggle-status", supplierController.toggleSupplierStatus);
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
