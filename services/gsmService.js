const GSM = require("../models/GSM");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");

class GsmService {
  async createGSM(data) {
    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      throw new AppError("GSM name is required", 400);
    }

    const exists = await GSM.findOne({
      $or: [{ name: trimmedName }, { value: data.value }],
    });

    if (exists) {
      throw new AppError("GSM with the same name or value already exists", 400);
    }

    const gsm = await GSM.create({
      name: trimmedName,
      value: data.value,
      active: data.active ?? true,
    });

    return gsm;
  }

  async getAllGSMs(filters = {}) {
    const query = {};
    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const gsms = await GSM.find(query).sort({ value: 1 });
    return gsms;
  }

  async getGSMById(id) {
    const gsm = await GSM.findById(id);
    if (!gsm) {
      throw new AppError("GSM not found", 404);
    }
    return gsm;
  }

  async updateGSM(id, updateData) {
    const trimmedName = updateData.name?.trim();
    if (!trimmedName) {
      throw new AppError("GSM name is required", 400);
    }

    const duplicate = await GSM.findOne({
      $or: [{ name: trimmedName }, { value: updateData.value }],
      _id: { $ne: id },
    });

    if (duplicate) {
      throw new AppError(
        "Another GSM with the same name or value already exists",
        400
      );
    }

    const gsm = await GSM.findByIdAndUpdate(
      id,
      {
        name: trimmedName,
        value: updateData.value,
        active:
          typeof updateData.active === "boolean"
            ? updateData.active
            : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!gsm) {
      throw new AppError("GSM not found", 404);
    }

    return gsm;
  }

  async toggleGSMStatus(id) {
    const gsm = await GSM.findById(id);

    if (!gsm) {
      throw new AppError("GSM not found", 404);
    }

    gsm.active = !gsm.active;
    await gsm.save();

    return gsm;
  }

  async deleteGSM(id) {
    const productCount = await Product.countDocuments({ gsmId: id });
    if (productCount > 0) {
      throw new AppError("Cannot delete GSM linked to products", 400);
    }

    const gsm = await GSM.findByIdAndDelete(id);
    if (!gsm) {
      throw new AppError("GSM not found", 404);
    }

    return { message: "GSM deleted successfully" };
  }
}

module.exports = new GsmService();

