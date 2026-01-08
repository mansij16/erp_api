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
router.get("/product/:productId", supplierController.getSuppliersByProduct);

// Admin/Manager routes
// router.use(authorize(["admin", "super_admin", "purchase_manager"]));

router.post("/", supplierController.createSupplier);
router.patch("/:id", supplierController.updateSupplier);
router.patch("/:id/toggle-status", supplierController.toggleSupplierStatus);
router.patch("/:id/rating", supplierController.updateSupplierRating);
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
