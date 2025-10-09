const express = require("express");
const router = express.Router();
const {
  getSKUs,
  getSKUsByProduct,
  getSKU,
  createSKU,
  updateSKU,
  deleteSKU,
} = require("../controllers/skuController");

router.route("/").get(getSKUs).post(createSKU);

router.route("/:id").get(getSKU).put(updateSKU).delete(deleteSKU);

router.get("/by-product/:productId", getSKUsByProduct);

module.exports = router;
