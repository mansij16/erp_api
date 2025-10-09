const Product = require("../models/Product");
const Category = require("../models/Category");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all products
const getProducts = handleAsyncErrors(async (req, res) => {
  const { categoryId, gsm, qualityName, active } = req.query;
  const filter = {};

  if (categoryId) filter.categoryId = categoryId;
  if (gsm) filter.gsm = parseInt(gsm);
  if (qualityName) filter.qualityName = qualityName;
  if (active !== undefined) filter.active = active === "true";

  const products = await Product.find(filter)
    .populate("categoryId", "name")
    .sort({ categoryName: 1, gsm: 1, qualityName: 1 });

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

// Get single product
const getProduct = handleAsyncErrors(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "categoryId",
    "name"
  );

  if (!product) {
    throw new AppError("Product not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: product,
  });
});

// Create product
const createProduct = handleAsyncErrors(async (req, res) => {
  const { categoryId, gsm, qualityName, qualityAliases, hsnCode } = req.body;

  // Get category details
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404, "RESOURCE_NOT_FOUND");
  }

  const product = await Product.create({
    categoryId,
    categoryName: category.name,
    gsm,
    qualityName,
    qualityAliases,
    hsnCode,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

// Update product
const updateProduct = handleAsyncErrors(async (req, res) => {
  const { categoryId, ...updateData } = req.body;

  // If category is being changed, update categoryName
  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404, "RESOURCE_NOT_FOUND");
    }
    updateData.categoryId = categoryId;
    updateData.categoryName = category.name;
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new AppError("Product not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: product,
  });
});

// Delete product
const deleteProduct = handleAsyncErrors(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError("Product not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Soft delete
  product.active = false;
  await product.save();

  res.json({
    success: true,
    message: "Product deactivated successfully",
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
