const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { validateCategory } = require("../validators/categoryValidator");
// const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
// router.use(authenticate);

// Public routes (for authenticated users)
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

// Admin only routes
// router.use(authorize(["admin", "super_admin"]));

router.post("/", validateCategory, categoryController.createCategory);
router.patch("/:id", categoryController.updateCategory);
router.patch("/:id/toggle-status", categoryController.toggleCategoryStatus);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
