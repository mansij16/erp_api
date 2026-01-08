const supplierService = require("../services/supplierService");
const catchAsync = require("../utils/catchAsync");

class SupplierController {
  getNextSupplierCode = catchAsync(async (req, res) => {
    const code = await supplierService.getNextSupplierCode();

    res.status(200).json({
      success: true,
      data: { supplierCode: code },
    });
  });

  createSupplier = catchAsync(async (req, res) => {
    const supplier = await supplierService.createSupplier(req.body);

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  });

  getAllSuppliers = catchAsync(async (req, res) => {
    const filters = {
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
      category: req.query.category,
      search: req.query.search,
    };

    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await supplierService.getAllSuppliers(filters, pagination);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  getSupplierById = catchAsync(async (req, res) => {
    const supplier = await supplierService.getSupplierById(req.params.id);

    res.status(200).json({
      success: true,
      data: supplier,
    });
  });

  getSupplierByCode = catchAsync(async (req, res) => {
    const supplier = await supplierService.getSupplierByCode(req.params.code);

    res.status(200).json({
      success: true,
      data: supplier,
    });
  });

  updateSupplier = catchAsync(async (req, res) => {
    const supplier = await supplierService.updateSupplier(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  });

  toggleSupplierStatus = catchAsync(async (req, res) => {
    const supplier = await supplierService.toggleSupplierStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `Supplier ${
        supplier.active ? "activated" : "deactivated"
      } successfully`,
      data: supplier,
    });
  });

  deleteSupplier = catchAsync(async (req, res) => {
    await supplierService.deleteSupplier(req.params.id);

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  });

  updateSupplierRating = catchAsync(async (req, res) => {
    const { rating, notes } = req.body;
    const supplier = await supplierService.updateSupplierRating(
      req.params.id,
      rating,
      notes
    );

    res.status(200).json({
      success: true,
      message: "Supplier rating updated successfully",
      data: supplier,
    });
  });

  getSuppliersByProduct = catchAsync(async (req, res) => {
    const suppliers = await supplierService.getSuppliersByProduct(
      req.params.productId
    );

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  });
}

module.exports = new SupplierController();
