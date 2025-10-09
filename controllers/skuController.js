const SKU = require("../models/SKU");
const Product = require("../models/Product");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all SKUs
const getSKUs = handleAsyncErrors(async (req, res) => {
  const { productId, categoryName, gsm, widthInches, active } = req.query;
  const filter = {};

  if (productId) filter.productId = productId;
  if (categoryName) filter.categoryName = categoryName;
  if (gsm) filter.gsm = parseInt(gsm);
  if (widthInches) filter.widthInches = parseInt(widthInches);
  if (active !== undefined) filter.active = active === "true";

  const skus = await SKU.find(filter)
    .populate("productId")
    .sort({ categoryName: 1, gsm: 1, widthInches: 1 });

  res.json({
    success: true,
    count: skus.length,
    data: skus,
  });
});

// Get SKUs by product
const getSKUsByProduct = handleAsyncErrors(async (req, res) => {
  const skus = await SKU.find({ productId: req.params.productId }).sort({
    widthInches: 1,
  });

  res.json({
    success: true,
    count: skus.length,
    data: skus,
  });
});

// Get single SKU
const getSKU = handleAsyncErrors(async (req, res) => {
  const sku = await SKU.findById(req.params.id).populate("productId");

  if (!sku) {
    throw new AppError("SKU not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: sku,
  });
});

// Create SKU
const createSKU = handleAsyncErrors(async (req, res) => {
  const { productId, widthInches, defaultLengthMeters, taxRate } = req.body;

  // Get product details
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Check if SKU already exists for this product and width
  const existingSKU = await SKU.findOne({ productId, widthInches });
  if (existingSKU) {
    throw new AppError(
      "SKU already exists for this product and width",
      400,
      "DUPLICATE_ENTRY"
    );
  }

  const sku = await SKU.create({
    productId,
    categoryName: product.categoryName,
    gsm: product.gsm,
    qualityName: product.qualityName,
    widthInches,
    defaultLengthMeters,
    taxRate: taxRate || 18,
  });

  res.status(201).json({
    success: true,
    data: sku,
  });
});

// Update SKU
const updateSKU = handleAsyncErrors(async (req, res) => {
  const sku = await SKU.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!sku) {
    throw new AppError("SKU not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: sku,
  });
});

// Delete SKU
const deleteSKU = handleAsyncErrors(async (req, res) => {
  const sku = await SKU.findById(req.params.id);

  if (!sku) {
    throw new AppError("SKU not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Soft delete
  sku.active = false;
  await sku.save();

  res.json({
    success: true,
    message: "SKU deactivated successfully",
  });
});

module.exports = {
  getSKUs,
  getSKUsByProduct,
  getSKU,
  createSKU,
  updateSKU,
  deleteSKU,
};
