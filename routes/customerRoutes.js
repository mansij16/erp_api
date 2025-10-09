const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  checkCredit,
  blockCustomer,
  unblockCustomer,
} = require("../controllers/customerController");

router.route("/").get(getCustomers).post(createCustomer);

router.route("/:id").get(getCustomer).put(updateCustomer);

router.post("/:id/check-credit", checkCredit);
router.post("/:id/block", blockCustomer);
router.post("/:id/unblock", unblockCustomer);

module.exports = router;
