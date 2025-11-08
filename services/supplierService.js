const Supplier = require("../models/Supplier");
const AppError = require("../utils/AppError");

class SupplierService {
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

    const supplier = await Supplier.create(data);
    return supplier;
  }

  async getAllSuppliers(filters = {}, pagination = {}) {
    const query = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.preferredSupplier !== undefined) {
      query.preferredSupplier = filters.preferredSupplier;
    }

    if (filters.category) {
      query.categories = filters.category;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { companyName: { $regex: filters.search, $options: "i" } },
        { code: { $regex: filters.search, $options: "i" } },
        { gstin: { $regex: filters.search, $options: "i" } },
      ];
    }

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .populate("categories")
        .populate("products")
        .sort({ preferredSupplier: -1, name: 1 })
        .skip(skip)
        .limit(limit),
      Supplier.countDocuments(query),
    ]);

    return {
      suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSupplierById(id) {
    const supplier = await Supplier.findById(id)
      .populate("categories")
      .populate("products");

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return supplier;
  }

  async getSupplierByCode(code) {
    const supplier = await Supplier.findOne({ code: code.toUpperCase() })
      .populate("categories")
      .populate("products");

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    return supplier;
  }

  async updateSupplier(id, updateData) {
    // Don't allow changing GSTIN
    delete updateData.gstin;
    delete updateData.code;

    // Handle contact persons update
    if (updateData.contactPersons) {
      const hasPrimary = updateData.contactPersons.some((cp) => cp.isPrimary);
      if (!hasPrimary && updateData.contactPersons.length > 0) {
        updateData.contactPersons[0].isPrimary = true;
      }
    }

    const supplier = await Supplier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("categories products");

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
    }).sort({ preferredSupplier: -1, rating: -1 });

    return suppliers;
  }
}

module.exports = new SupplierService();
