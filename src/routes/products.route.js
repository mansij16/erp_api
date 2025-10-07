const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const productController = require("../controllers/product.controller");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize(["super_admin", "admin"]),
  productController.createProduct
);
router.get("/", authenticate, productController.listProducts);
router.get("/:id", authenticate, productController.getProduct);

module.exports = router;
