const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const supplierController = require("../controllers/supplier.controller");

const router = express.Router();

// Supplier CRUD
router.post(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  supplierController.createSupplier
);

router.get(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "accountant"]),
  supplierController.listSuppliers
);

router.get(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager", "accountant"]),
  supplierController.getSupplier
);

router.put(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  supplierController.updateSupplier
);

router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin"]),
  supplierController.deleteSupplier
);

// Supplier Performance
router.get(
  "/:id/performance",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  supplierController.getSupplierPerformance
);

// Supplier Products
router.get(
  "/:id/products",
  authenticate,
  authorize(["admin", "super_admin", "purchase_manager"]),
  supplierController.getSupplierProducts
);

module.exports = router;
