const SKU = require("../models/SKU");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");

class SKUService {
  async createSKU(data) {
    // Verify product exists
    const product = await Product.findById(data.productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    // Check for duplicate SKU
    const existingSKU = await SKU.findOne({
      productId: data.productId,
      widthInches: data.widthInches,
    });

    if (existingSKU) {
      throw new AppError("SKU with this product and width already exists", 400);
    }

    const sku = await SKU.create(data);
    return sku.populate({
      path: "productId",
      populate: { path: "category" },
    });
  }

  async getAllSKUs(filters = {}, pagination = {}) {
    const query = {};

    // Apply filters
    if (filters.productId) {
      query.productId = filters.productId;
    }

    if (filters.widthInches) {
      query.widthInches = filters.widthInches;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    // For searching by category or GSM, we need to join with product
    if (filters.categoryId || filters.gsm) {
      const Product = require("../models/Product");
      const GSM = require("../models/GSM");
      const productQuery = {};
      if (filters.categoryId) productQuery.categoryId = filters.categoryId;
      if (filters.gsm) {
        // Find GSM by name if provided as string
        if (filters.gsm.match(/^[0-9a-fA-F]{24}$/)) {
          productQuery.gsmId = filters.gsm;
        } else {
          const gsm = await GSM.findOne({ name: filters.gsm });
          if (gsm) {
            productQuery.gsmId = gsm._id;
          } else {
            // No matching GSM, return empty results
            productQuery.gsmId = null;
          }
        }
      }

      const products = await Product.find(productQuery).select("_id");
      query.productId = { $in: products.map((p) => p._id) };
    }

    // Pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const [skus, total] = await Promise.all([
      SKU.find(query)
        .populate({
          path: "productId",
          populate: { path: "category" },
        })
        .sort({ skuCode: 1 })
        .skip(skip)
        .limit(limit),
      SKU.countDocuments(query),
    ]);

    return {
      skus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSKUById(id) {
    const sku = await SKU.findById(id).populate({
      path: "productId",
      populate: { path: "category" },
    });

    if (!sku) {
      throw new AppError("SKU not found", 404);
    }

    return sku;
  }

  async getSKUByCode(skuCode) {
    const sku = await SKU.findOne({ skuCode }).populate({
      path: "productId",
      populate: { path: "category" },
    });

    if (!sku) {
      throw new AppError("SKU not found", 404);
    }

    return sku;
  }

  async updateSKU(id, updateData) {
    // Don't allow changing product or width (would be a different SKU)
    delete updateData.productId;
    delete updateData.widthInches;
    delete updateData.skuCode;
    delete updateData.skuAlias;

    const sku = await SKU.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "productId",
      populate: { path: "category" },
    });

    if (!sku) {
      throw new AppError("SKU not found", 404);
    }

    return sku;
  }

  async toggleSKUStatus(id) {
    const sku = await SKU.findById(id);

    if (!sku) {
      throw new AppError("SKU not found", 404);
    }

    sku.active = !sku.active;
    await sku.save();

    return sku.populate({
      path: "productId",
      populate: { path: "category" },
    });
  }

  async deleteSKU(id) {
    // Check if SKU has inventory before deleting
    const Roll = require("../models/Roll");
    const rollCount = await Roll.countDocuments({ skuId: id });

    if (rollCount > 0) {
      throw new AppError("Cannot delete SKU with existing inventory", 400);
    }

    const sku = await SKU.findByIdAndDelete(id);

    if (!sku) {
      throw new AppError("SKU not found", 404);
    }

    return { message: "SKU deleted successfully" };
  }

  async bulkCreateSKUsForProduct(productId, widths = [24, 36, 44, 63]) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const width of widths) {
      try {
        const sku = await this.createSKU({
          productId,
          widthInches: width,
        });
        results.success.push(sku);
      } catch (error) {
        results.failed.push({
          width,
          error: error.message,
        });
      }
    }

    return results;
  }

  async getAvailableSKUs() {
    // Get SKUs with available inventory
    const Roll = require("../models/Roll");

    const availableSKUs = await Roll.aggregate([
      { $match: { status: "Mapped" } },
      {
        $group: {
          _id: "$skuId",
          availableRolls: { $sum: 1 },
          totalMeters: { $sum: "$currentLengthMeters" },
        },
      },
    ]);

    const skuIds = availableSKUs.map((item) => item._id);

    const skus = await SKU.find({
      _id: { $in: skuIds },
      active: true,
    }).populate({
      path: "productId",
      populate: { path: "category" },
    });

    // Merge availability data
    return skus.map((sku) => {
      const availability = availableSKUs.find(
        (item) => item._id.toString() === sku._id.toString()
      );
      return {
        ...sku.toJSON(),
        availability: {
          rolls: availability?.availableRolls || 0,
          meters: availability?.totalMeters || 0,
        },
      };
    });
  }
}

module.exports = new SKUService();
