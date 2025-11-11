const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
// const { authenticate, authorize } = require("../middlewares/auth");

// router.use(authenticate);

// Public routes
router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomer);
router.get("/:id/credit-check", customerController.checkCredit);
router.get("/:id/rate-history", customerController.getRateHistory);

// Sales team routes
// router.use(authorize(["admin", "sales_manager", "sales_exec"]));

router.post("/", customerController.createCustomer);
router.patch("/:id", customerController.updateCustomer);

// Admin only
// router.use(authorize(["admin", "super_admin"]));

router.post("/:id/block", customerController.blockCustomer);
router.post("/:id/unblock", customerController.unblockCustomer);
router.delete("/:id", customerController.deleteCustomer);

module.exports = router;
