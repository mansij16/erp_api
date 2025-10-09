const Supplier = require("../models/Supplier");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all suppliers
const getSuppliers = handleAsyncErrors(async (req, res) => {
  const { active, state } = req.query;
  const filter = {};

  if (active !== undefined) filter.active = active === "true";
  if (state) filter.state = state;

  const suppliers = await Supplier.find(filter).sort({ name: 1 });

  res.json({
    success: true,
    count: suppliers.length,
    data: suppliers,
  });
});

// Get single supplier
const getSupplier = handleAsyncErrors(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    throw new AppError("Supplier not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: supplier,
  });
});

// Create supplier
const createSupplier = handleAsyncErrors(async (req, res) => {
  const { name, state, address, contactPersons } = req.body;

  // Generate supplier code
  const lastSupplier = await Supplier.findOne().sort({ supplierCode: -1 });
  let sequence = 1;
  if (lastSupplier) {
    const lastSequence = parseInt(lastSupplier.supplierCode.split("-")[1]);
    sequence = lastSequence + 1;
  }
  const supplierCode = numberingService.generateSupplierCode(sequence);

  const supplier = await Supplier.create({
    supplierCode,
    name,
    state,
    address,
    contactPersons,
  });

  res.status(201).json({
    success: true,
    data: supplier,
  });
});

// Update supplier
const updateSupplier = handleAsyncErrors(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!supplier) {
    throw new AppError("Supplier not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: supplier,
  });
});

// Delete supplier
const deleteSupplier = handleAsyncErrors(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    throw new AppError("Supplier not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Soft delete
  supplier.active = false;
  await supplier.save();

  res.json({
    success: true,
    message: "Supplier deactivated successfully",
  });
});

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
