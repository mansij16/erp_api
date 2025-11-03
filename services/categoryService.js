const Category = require("../models/Category");
const AppError = require("../utils/AppError");

class CategoryService {
  async createCategory(data) {
    try {
      const existingCategory = await Category.findOne({
        $or: [{ name: data.name }, { code: data.code }],
      });

      if (existingCategory) {
        throw new AppError(
          "Category with this name or code already exists",
          400
        );
      }

      const category = await Category.create(data);
      return category;
    } catch (error) {
      throw error;
    }
  }

  async getAllCategories(filters = {}) {
    const query = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const categories = await Category.find(query).sort({ name: 1 });
    return categories;
  }

  async getCategoryById(id) {
    const category = await Category.findById(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return category;
  }

  async updateCategory(id, updateData) {
    // Prevent updating certain fields
    delete updateData.code; // Code should not be changed

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return category;
  }

  async toggleCategoryStatus(id) {
    const category = await Category.findById(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    category.active = !category.active;
    await category.save();

    return category;
  }

  async deleteCategory(id) {
    // Check if category has products before deleting
    const Product = require("../models/Product");
    const productCount = await Product.countDocuments({ categoryId: id });

    if (productCount > 0) {
      throw new AppError("Cannot delete category with existing products", 400);
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    return { message: "Category deleted successfully" };
  }
}

module.exports = new CategoryService();
