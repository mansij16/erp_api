const productService = require("../services/productService");
const catchAsync = require("../utils/catchAsync");

class ProductController {
  createProduct = catchAsync(async (req, res) => {
    const product = await productService.createProduct(req.body);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  });

  getAllProducts = catchAsync(async (req, res) => {
    const filters = {
      categoryId: req.query.categoryId,
      gsm: req.query.gsm ? parseInt(req.query.gsm) : undefined,
      qualityName: req.query.qualityName,
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

    const result = await productService.getAllProducts(filters, pagination);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  getProductById = catchAsync(async (req, res) => {
    const product = await productService.getProductById(req.params.id);

    res.status(200).json({
      success: true,
      data: product,
    });
  });

  updateProduct = catchAsync(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  });

  toggleProductStatus = catchAsync(async (req, res) => {
    const product = await productService.toggleProductStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `Product ${
        product.active ? "activated" : "deactivated"
      } successfully`,
      data: product,
    });
  });

  deleteProduct = catchAsync(async (req, res) => {
    await productService.deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  });

  getProductsByCategoryAndGSM = catchAsync(async (req, res) => {
    const { categoryId, gsm } = req.params;
    const products = await productService.getProductsByCategoryAndGSM(
      categoryId,
      parseInt(gsm)
    );

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  });

  bulkCreateProducts = catchAsync(async (req, res) => {
    const results = await productService.bulkCreateProducts(req.body.products);

    res.status(201).json({
      success: true,
      message: "Bulk product creation completed",
      data: results,
    });
  });
}

module.exports = new ProductController();
