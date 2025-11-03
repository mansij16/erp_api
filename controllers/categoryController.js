const categoryService = require("../services/categoryService");
const catchAsync = require("../utils/catchAsync");

class CategoryController {
  createCategory = catchAsync(async (req, res) => {
    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  });

  getAllCategories = catchAsync(async (req, res) => {
    const filters = {
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
    };

    const categories = await categoryService.getAllCategories(filters);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  });

  getCategoryById = catchAsync(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: category,
    });
  });

  updateCategory = catchAsync(async (req, res) => {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  });

  toggleCategoryStatus = catchAsync(async (req, res) => {
    const category = await categoryService.toggleCategoryStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `Category ${
        category.active ? "activated" : "deactivated"
      } successfully`,
      data: category,
    });
  });

  deleteCategory = catchAsync(async (req, res) => {
    await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  });
}

module.exports = new CategoryController();
