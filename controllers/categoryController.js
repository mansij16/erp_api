const Category = require("../models/Category");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all categories
const getCategories = handleAsyncErrors(async (req, res) => {
  const { active } = req.query;
  const filter = {};

  if (active !== undefined) {
    filter.active = active === "true";
  }

  const categories = await Category.find(filter).sort({ name: 1 });

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// Get single category
const getCategory = handleAsyncErrors(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError("Category not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: category,
  });
});

// Create category
const createCategory = handleAsyncErrors(async (req, res) => {
  const { name, hsnCode } = req.body;

  const category = await Category.create({
    name,
    hsnCode,
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

// Update category
const updateCategory = handleAsyncErrors(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new AppError("Category not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: category,
  });
});

// Delete category
const deleteCategory = handleAsyncErrors(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError("Category not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Soft delete
  category.active = false;
  await category.save();

  res.json({
    success: true,
    message: "Category deactivated successfully",
  });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
