// services/productService.js
const Product = require("../models/Product");
const Category = require("../models/Category");
const GSM = require("../models/GSM");
const Quality = require("../models/Quality");
const AppError = require("../utils/AppError");

class ProductService {
  async createProduct(data) {
    // Verify category exists
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Verify GSM exists if gsmId provided
    if (data.gsmId) {
      const gsm = await GSM.findById(data.gsmId);
      if (!gsm) {
        throw new AppError("GSM not found", 404);
      }
    }

    // Verify Quality exists if qualityId provided
    if (data.qualityId) {
      const quality = await Quality.findById(data.qualityId);
      if (!quality) {
        throw new AppError("Quality not found", 404);
      }
    }

    // Check for duplicate product
    const existingProduct = await Product.findOne({
      categoryId: data.categoryId,
      gsmId: data.gsmId,
      qualityId: data.qualityId,
    });

    if (existingProduct) {
      throw new AppError("Product with this combination already exists", 400);
    }

    // Inherit HSN code from category if not provided
    if (!data.hsnCode) {
      data.hsnCode = category.hsnCode;
    }

    const product = await Product.create(data);
    return await Product.findById(product._id)
      .populate("categoryId", "name code hsnCode")
      .populate("gsmId", "name value")
      .populate("qualityId", "name");
  }

  async getAllProducts(filters = {}, pagination = {}) {
    const query = {};

    // Apply filters
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }

    // If gsm filter is provided as name, find the GSM ID
    if (filters.gsm) {
      // Check if it's an ObjectId or a name
      if (filters.gsm.match(/^[0-9a-fA-F]{24}$/)) {
        query.gsmId = filters.gsm;
      } else {
        // It's a name, find the GSM by name
        const gsm = await GSM.findOne({ name: filters.gsm });
        if (gsm) {
          query.gsmId = gsm._id;
        } else {
          // No matching GSM, return empty results
          query.gsmId = null;
        }
      }
    }

    // If qualityName filter is provided, find the Quality ID
    if (filters.qualityName) {
      // Check if it's an ObjectId or a name
      if (filters.qualityName.match(/^[0-9a-fA-F]{24}$/)) {
        query.qualityId = filters.qualityName;
      } else {
        // It's a name, find the Quality by name
        const quality = await Quality.findOne({ name: filters.qualityName });
        if (quality) {
          query.qualityId = quality._id;
        } else {
          // No matching Quality, return empty results
          query.qualityId = null;
        }
      }
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
        .populate("categoryId", "name code hsnCode")
        .populate("gsmId", "name value")
        .populate("qualityId", "name")
        .sort({ categoryId: 1, gsmId: 1, qualityId: 1 })
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
    const product = await Product.findById(id)
      .populate("categoryId", "name code hsnCode")
      .populate("gsmId", "name value")
      .populate("qualityId", "name");

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }

  async updateProduct(id, updateData) {
    // Don't allow changing category, gsmId, or qualityId (would be a different product)
    delete updateData.categoryId;
    delete updateData.gsmId;
    delete updateData.qualityId;
    delete updateData.productCode;

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("categoryId", "name code hsnCode")
      .populate("gsmId", "name value")
      .populate("qualityId", "name");

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

    return await Product.findById(product._id)
      .populate("categoryId", "name code hsnCode")
      .populate("gsmId", "name value")
      .populate("qualityId", "name");
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
    // Find GSM by name if gsm is provided as a string
    let gsmId = gsm;
    if (gsm && !gsm.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a name, not an ObjectId
      const gsmRecord = await GSM.findOne({ name: gsm });
      if (!gsmRecord) {
        return []; // No matching GSM
      }
      gsmId = gsmRecord._id;
    }

    const products = await Product.find({
      categoryId,
      gsmId,
      active: true,
    })
      .populate("categoryId", "name code hsnCode")
      .populate("gsmId", "name value")
      .populate("qualityId", "name");

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
