const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const reportsController = require("../controllers/reports.controller");

const router = express.Router();

// Inventory Reports
router.get("/inventory/stock-summary", 
  authenticate, 
  authorize(["admin", "super_admin", "warehouse"]), 
  reportsController.getStockSummary
);

router.get("/inventory/batch-aging", 
  authenticate, 
  authorize(["admin", "super_admin", "warehouse"]), 
  reportsController.getBatchAging
);

// Sales Reports
router.get("/sales/customer-trends", 
  authenticate, 
  authorize(["admin", "super_admin", "sales_manager"]), 
  reportsController.getCustomerSalesTrends
);

router.get("/sales/sku-performance", 
  authenticate, 
  authorize(["admin", "super_admin", "sales_manager"]), 
  reportsController.getSkuPerformance
);

// Accounting Reports
router.get("/accounting/trial-balance", 
  authenticate, 
  authorize(["admin", "super_admin", "accountant"]), 
  reportsController.getTrialBalance
);

router.get("/accounting/pl-statement", 
  authenticate, 
  authorize(["admin", "super_admin", "accountant"]), 
  reportsController.getProfitAndLoss
);

router.get("/accounting/balance-sheet", 
  authenticate, 
  authorize(["admin", "super_admin", "accountant"]), 
  reportsController.getBalanceSheet
);

// Credit Reports
router.get("/credit/ar-aging", 
  authenticate, 
  authorize(["admin", "super_admin", "accountant", "sales_manager"]), 
  reportsController.getAgingReport
);

module.exports = router;
