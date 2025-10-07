const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const customerController = require("../controllers/customer.controller");

const router = express.Router();

// Customer CRUD
router.post(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager"]),
  customerController.createCustomer
);

router.get(
  "/",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager", "sales_exec", "accountant"]),
  customerController.listCustomers
);

router.get(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager", "sales_exec", "accountant"]),
  customerController.getCustomer
);

router.put(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager"]),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "super_admin"]),
  customerController.deleteCustomer
);

// Customer Credit Management
router.post(
  "/:id/credit-limit",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager"]),
  customerController.updateCreditLimit
);

router.get(
  "/:id/transactions",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager", "accountant"]),
  customerController.getCustomerTransactions
);

// Customer Rate Management
router.post(
  "/:id/rates",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager"]),
  customerController.addCustomerRate
);

router.get(
  "/:id/rates",
  authenticate,
  authorize(["admin", "super_admin", "sales_manager", "sales_exec"]),
  customerController.getCustomerRates
);

module.exports = router;
