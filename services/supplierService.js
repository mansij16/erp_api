const Supplier = require("../models/Supplier");
const AppError = require("../utils/AppError");

const sanitizeNumericValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "object") {
    if (value === null) return null;
    if (value.value !== undefined) {
      return sanitizeNumericValue(value.value);
    }
    if (value.baseRate !== undefined) {
      return sanitizeNumericValue(value.baseRate);
    }
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveCategoryId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return value._id;
    if (value.id) return value.id;
    if (value.categoryId) return resolveCategoryId(value.categoryId);
  }
  return value;
};

const sanitizeCategoryRates = (rates = []) => {
  if (!Array.isArray(rates)) return [];

  const seen = new Set();
  const sanitized = [];

  rates.forEach((rate = {}) => {
    const resolvedId =
      resolveCategoryId(rate.categoryId) || resolveCategoryId(rate.category);
    const baseRate = sanitizeNumericValue(rate.baseRate);

    if (!resolvedId || baseRate === null) {
      return;
    }

    const idString = String(resolvedId);
    if (seen.has(idString)) {
      return;
    }

    seen.add(idString);
    sanitized.push({
      categoryId: resolvedId,
      baseRate,
    });
  });

  return sanitized;
};

class SupplierService {
  async getNextSupplierCode() {
    const count = await Supplier.countDocuments();
    return `SUP${(count + 1).toString().padStart(5, "0")}`;
  }

  async createSupplier(data) {
    // Check for duplicate GSTIN
    const existingSupplier = await Supplier.findOne({ gstin: data.gstin });
    if (existingSupplier) {
      throw new AppError("Supplier with this GSTIN already exists", 400);
    }

    // Ensure at least one primary contact
    if (data.contactPersons && data.contactPersons.length > 0) {
      const hasPrimary = data.contactPersons.some((cp) => cp.isPrimary);
      if (!hasPrimary) {
        data.contactPersons[0].isPrimary = true;
      }
    }

    if (data.categoryRates) {
      data.categoryRates = sanitizeCategoryRates(data.categoryRates);
    }

    const supplier = await Supplier.create(data);
    return supplier;
  }

  async getAllSuppliers(filters = {}, pagination = {}) {
    const query = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.category) {
      query.categories = filters.category;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { supplierCode: { $regex: filters.search, $options: "i" } },
        { gstin: { $regex: filters.search, $options: "i" } },
      ];
    }

    const hasLimit = pagination.limit !== undefined && pagination.limit !== null;
    const page = hasLimit ? parseInt(pagination.page) || 1 : 1;
    const limit = hasLimit ? parseInt(pagination.limit) || 10 : null;
    const skip = hasLimit && limit ? (page - 1) * limit : 0;

    const supplierQuery = Supplier.find(query)
      .populate("categories")
      .populate("products")
      .populate("categoryRates.categoryId", "name code")
      .sort({ name: 1 });

    if (hasLimit && limit) {
      supplierQuery.skip(skip).limit(limit);
    }

    const [suppliers, total] = await Promise.all([
      supplierQuery.exec(),
      Supplier.countDocuments(query),
    ]);

    return {
      suppliers,
      pagination: hasLimit
        ? {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          }
        : {
            page: 1,
            limit: total,
            total,
            pages: 1,
          },
    };
  }

  async getSupplierById(id) {
    const supplier = await Supplier.findById(id)
      .populate("categories")
      .populate("products")
      .populate("categoryRates.categoryId", "name code");

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return supplier;
  }

  async getSupplierByCode(code) {
    const supplier = await Supplier.findOne({
      supplierCode: code.toUpperCase(),
    })
      .populate("categories")
      .populate("products")
      .populate("categoryRates.categoryId", "name code");

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return supplier;
  }

  async updateSupplier(id, updateData) {
    // Don't allow changing GSTIN or supplierCode
    delete updateData.gstin;
    delete updateData.supplierCode;

    // Handle contact persons update
    if (updateData.contactPersons) {
      const hasPrimary = updateData.contactPersons.some((cp) => cp.isPrimary);
      if (!hasPrimary && updateData.contactPersons.length > 0) {
        updateData.contactPersons[0].isPrimary = true;
      }
    }

    if (updateData.categoryRates) {
      updateData.categoryRates = sanitizeCategoryRates(updateData.categoryRates);
    }

    const supplier = await Supplier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("categories")
      .populate("products")
      .populate("categoryRates.categoryId", "name code");

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return supplier;
  }

  async toggleSupplierStatus(id) {
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    supplier.active = !supplier.active;
    await supplier.save();

    return supplier;
  }

  async deleteSupplier(id) {
    // Check if supplier has purchase orders
    const PurchaseOrder = require("../models/PurchaseOrder");
    const poCount = await PurchaseOrder.countDocuments({ supplierId: id });

    if (poCount > 0) {
      throw new AppError(
        "Cannot delete supplier with existing purchase orders",
        400
      );
    }

    const supplier = await Supplier.findByIdAndDelete(id);

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return { message: "Supplier deleted successfully" };
  }

  async updateSupplierRating(id, rating, notes) {
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    supplier.rating = rating;
    if (notes) {
      supplier.notes = notes;
    }

    await supplier.save();
    return supplier;
  }

  async getSuppliersByProduct(productId) {
    const suppliers = await Supplier.find({
      products: productId,
      active: true,
    })
      .populate("categoryRates.categoryId", "name code")
      .sort({ rating: -1 });

    return suppliers;
  }
}

module.exports = new SupplierService();
