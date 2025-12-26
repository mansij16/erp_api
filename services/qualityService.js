const Quality = require("../models/Quality");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");

class QualityService {
  async createQuality(data) {
    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      throw new AppError("Quality name is required", 400);
    }

    const exists = await Quality.findOne({ name: trimmedName });
    if (exists) {
      throw new AppError("Quality with the same name already exists", 400);
    }

    const quality = await Quality.create({
      name: trimmedName,
      active: data.active ?? true,
    });

    return quality;
  }

  async getAllQualities(filters = {}) {
    const query = {};
    if (filters.active !== undefined) {
      query.active = filters.active;
    }
    const qualities = await Quality.find(query).sort({ name: 1 });
    return qualities;
  }

  async getQualityById(id) {
    const quality = await Quality.findById(id);
    if (!quality) {
      throw new AppError("Quality not found", 404);
    }
    return quality;
  }

  async updateQuality(id, updateData) {
    const trimmedName = updateData.name?.trim();
    if (!trimmedName) {
      throw new AppError("Quality name is required", 400);
    }

    const duplicate = await Quality.findOne({
      name: trimmedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError("Another quality with the same name exists", 400);
    }

    const quality = await Quality.findByIdAndUpdate(
      id,
      {
        name: trimmedName,
        active:
          typeof updateData.active === "boolean"
            ? updateData.active
            : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!quality) {
      throw new AppError("Quality not found", 404);
    }

    return quality;
  }

  async toggleQualityStatus(id) {
    const quality = await Quality.findById(id);
    if (!quality) {
      throw new AppError("Quality not found", 404);
    }

    quality.active = !quality.active;
    await quality.save();
    return quality;
  }

  async deleteQuality(id) {
    const productCount = await Product.countDocuments({ qualityId: id });
    if (productCount > 0) {
      throw new AppError("Cannot delete quality linked to products", 400);
    }

    const quality = await Quality.findByIdAndDelete(id);
    if (!quality) {
      throw new AppError("Quality not found", 404);
    }

    return { message: "Quality deleted successfully" };
  }
}

module.exports = new QualityService();

