const skuService = require("../services/skuService");
const catchAsync = require("../utils/catchAsync");

class SKUController {
  createSKU = catchAsync(async (req, res) => {
    const sku = await skuService.createSKU(req.body);

    res.status(201).json({
      success: true,
      message: "SKU created successfully",
      data: sku,
    });
  });

  getAllSKUs = catchAsync(async (req, res) => {
    const filters = {
      productId: req.query.productId,
      widthInches: req.query.widthInches
        ? parseInt(req.query.widthInches)
        : undefined,
      categoryId: req.query.categoryId,
      gsm: req.query.gsm ? parseInt(req.query.gsm) : undefined,
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
    };

    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await skuService.getAllSKUs(filters, pagination);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  getSKUById = catchAsync(async (req, res) => {
    const sku = await skuService.getSKUById(req.params.id);

    res.status(200).json({
      success: true,
      data: sku,
    });
  });

  getSKUByCode = catchAsync(async (req, res) => {
    const sku = await skuService.getSKUByCode(req.params.code);

    res.status(200).json({
      success: true,
      data: sku,
    });
  });

  updateSKU = catchAsync(async (req, res) => {
    const sku = await skuService.updateSKU(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "SKU updated successfully",
      data: sku,
    });
  });

  toggleSKUStatus = catchAsync(async (req, res) => {
    const sku = await skuService.toggleSKUStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `SKU ${sku.active ? "activated" : "deactivated"} successfully`,
      data: sku,
    });
  });

  deleteSKU = catchAsync(async (req, res) => {
    await skuService.deleteSKU(req.params.id);

    res.status(200).json({
      success: true,
      message: "SKU deleted successfully",
    });
  });

  bulkCreateSKUs = catchAsync(async (req, res) => {
    const { productId, widths } = req.body;
    const results = await skuService.bulkCreateSKUsForProduct(
      productId,
      widths
    );

    res.status(201).json({
      success: true,
      message: "Bulk SKU creation completed",
      data: results,
    });
  });

  getAvailableSKUs = catchAsync(async (req, res) => {
    const skus = await skuService.getAvailableSKUs();

    res.status(200).json({
      success: true,
      count: skus.length,
      data: skus,
    });
  });
}

module.exports = new SKUController();
