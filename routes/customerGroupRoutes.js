const express = require("express");
const router = express.Router();
const customerGroupController = require("../controllers/customerGroupController");
// const { authenticate, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
// router.use(authenticate);

// Public routes (for authenticated users)
router.get("/", customerGroupController.getAllCustomerGroups);
router.get("/:id", customerGroupController.getCustomerGroupById);

// Admin only routes
// router.use(authorize(["admin", "super_admin"]));

router.post("/", customerGroupController.createCustomerGroup);
router.patch("/:id", customerGroupController.updateCustomerGroup);
router.patch(
  "/:id/toggle-status",
  customerGroupController.toggleCustomerGroupStatus
);
router.delete("/:id", customerGroupController.deleteCustomerGroup);

module.exports = router;

