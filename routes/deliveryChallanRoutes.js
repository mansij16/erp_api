const express = require("express");
const router = express.Router();
const {
  getDeliveryChallans,
  getDeliveryChallan,
  createDeliveryChallan,
  updateDeliveryChallan,
  closeDeliveryChallan,
} = require("../controllers/deliveryChallanController");

// All routes require authentication
// TODO: Add authentication middleware

router
  .route("/")
  .get(getDeliveryChallans)
  .post(createDeliveryChallan);

router
  .route("/:id")
  .get(getDeliveryChallan)
  .put(updateDeliveryChallan);

router.post("/:id/close", closeDeliveryChallan);

module.exports = router;
