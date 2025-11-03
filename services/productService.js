// services/productService.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const AppError = require("../utils/AppError");

class ProductService {
  async createProduct(data) {
    // Verify category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Check for duplicate product
    const existingProduct = await Product.findOne({
      categoryId: data.categoryId,
      gsm: data.gsm,
      qualityName: data.qualityName,
    });

    if (existingProduct) {
      throw new AppError("Product with this combination already exists", 400);
    }

    // Inherit HSN code from category if not provided
    if (!data.hsnCode) {
      data.hsnCode = category.hsnCode;
    }

    const product = await Product.create(data);
    return product.populate("category");
  }

  async getAllProducts(filters = {}, pagination = {}) {
    const query = {};

    // Apply filters
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }

    if (filters.gsm) {
      query.gsm = filters.gsm;
    }

    if (filters.qualityName) {
      query.qualityName = filters.qualityName;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    // Pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category")
        .sort({ categoryId: 1, gsm: 1, qualityName: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id) {
    const product = await Product.findById(id).populate("category");

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }

  async updateProduct(id, updateData) {
    // Don't allow changing category, gsm, or quality (would be a different product)
    delete updateData.categoryId;
    delete updateData.gsm;
    delete updateData.qualityName;
    delete updateData.productCode;

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category");

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }

  async toggleProductStatus(id) {
    const product = await Product.findById(id);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    product.active = !product.active;
    await product.save();

    return product.populate("category");
  }

  async deleteProduct(id) {
    // Check if product has SKUs before deleting
    const SKU = require("../models/SKU");
    const skuCount = await SKU.countDocuments({ productId: id });

    if (skuCount > 0) {
      throw new AppError("Cannot delete product with existing SKUs", 400);
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return { message: "Product deleted successfully" };
  }

  async getProductsByCategoryAndGSM(categoryId, gsm) {
    const products = await Product.find({
      categoryId,
      gsm,
      active: true,
    }).populate("category");

    return products;
  }

  async bulkCreateProducts(productsData) {
    const results = {
      success: [],
      failed: [],
    };

    for (const productData of productsData) {
      try {
        const product = await this.createProduct(productData);
        results.success.push(product);
      } catch (error) {
        results.failed.push({
          data: productData,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = new ProductService();
