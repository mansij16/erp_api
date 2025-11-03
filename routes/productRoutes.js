// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
// const { authorize } = require("../middleware/authMiddleware");

// All routes require authentication
// router.use(authenticate);

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.get(
  "/category/:categoryId/gsm/:gsm",
  productController.getProductsByCategoryAndGSM
);

// Admin only routes
// router.use(authorize(["admin", "super_admin"]));

router.post("/", productController.createProduct);
router.post("/bulk", productController.bulkCreateProducts);
router.patch("/:id", productController.updateProduct);
router.patch("/:id/toggle-status", productController.toggleProductStatus);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
