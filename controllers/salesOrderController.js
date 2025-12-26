const SalesOrder = require("../models/SalesOrder");
const Customer = require("../models/Customer");
const SKU = require("../models/SKU");
const numberingService = require("../services/numberingService");
const pricingService = require("../services/pricingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all sales orders
const getSalesOrders = handleAsyncErrors(async (req, res) => {
  const { status, customerId, dateFrom, dateTo } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const salesOrders = await SalesOrder.find(filter)
    .populate({
      path: "customerId",
      select: "companyName customerCode",
      populate: { path: "customerGroupId", select: "name code" },
    })
    .populate({
      path: "lines.skuId",
      select: "skuCode categoryName gsm qualityName widthInches productId",
      populate: {
        path: "productId",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "gsmId", select: "value label" },
          { path: "qualityId", select: "name" },
        ],
      },
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: salesOrders.length,
    data: salesOrders,
  });
});

// Get single sales order
const getSalesOrder = handleAsyncErrors(async (req, res) => {
  const salesOrder = await SalesOrder.findById(req.params.id)
    .populate({
      path: "customerId",
      select: "companyName customerCode creditPolicy baseRate44",
      populate: { path: "customerGroupId", select: "name code" },
    })
    .populate({
      path: "lines.skuId",
      select: "skuCode categoryName gsm qualityName widthInches productId",
      populate: {
        path: "productId",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "gsmId", select: "value label" },
          { path: "qualityId", select: "name" },
        ],
      },
    });

  if (!salesOrder) {
    throw new AppError("Sales order not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: salesOrder,
  });
});

// Create sales order with pricing calculation
const createSalesOrder = handleAsyncErrors(async (req, res) => {
  const { customerId, lines, notes } = req.body;

  // Verify customer exists and is not blocked
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (customer.creditPolicy?.isBlocked) {
    throw new AppError("Customer is blocked", 400, "CUSTOMER_BLOCKED");
  }

  // Generate SO number
  const soNumber = await numberingService.generateNumber("SO", SalesOrder);

  // Process lines with pricing calculation
  let subtotal = 0;
  let taxAmount = 0;

  const processedLines = [];

  for (const line of lines) {
    const sku = await SKU.findById(line.skuId);
    if (!sku) {
      throw new AppError(`SKU not found: ${line.skuId}`, 404, "RESOURCE_NOT_FOUND");
    }

    // Calculate pricing using 44" benchmark
    const pricing = pricingService.calculateSalesPricing(
      customer.baseRate44,
      sku.widthInches,
      line.lengthMetersPerRoll,
      line.qtyRolls,
      line.overrideRatePerRoll
    );

    const lineTotal = pricing.lineTotal;
    const lineTax = lineTotal * (sku.taxRate / 100);

    subtotal += lineTotal;
    taxAmount += lineTax;

    processedLines.push({
      skuId: line.skuId,
      categoryName: sku.categoryName,
      gsm: sku.gsm,
      qualityName: sku.qualityName,
      widthInches: sku.widthInches,
      lengthMetersPerRoll: line.lengthMetersPerRoll,
      qtyRolls: line.qtyRolls,
      totalMeters: line.qtyRolls * line.lengthMetersPerRoll,
      derivedRatePerRoll: pricing.derivedRatePerRoll,
      overrideRatePerRoll: line.overrideRatePerRoll,
      finalRatePerRoll: pricing.finalRatePerRoll,
      taxRate: sku.taxRate,
      lineTotal: lineTotal + lineTax,
    });
  }

  // Populate customerGroupId if it exists
  const customerWithGroup = await Customer.findById(customerId).populate(
    "customerGroupId",
    "name code"
  );

  const salesOrder = await SalesOrder.create({
    soNumber,
    customerId,
    customerName: customer.companyName,
    customerGroup:
      customerWithGroup.customerGroupId?.name ||
      customerWithGroup.group ||
      null,
    lines: processedLines,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
    creditCheckPassed: false, // Will be updated on confirmation
    notes,
    createdBy: req.user ? req.user._id : undefined,
  });

  const populatedOrder = await SalesOrder.findById(salesOrder._id)
    .populate({
      path: "customerId",
      select: "companyName customerCode",
      populate: { path: "customerGroupId", select: "name code" },
    })
    .populate("lines.skuId", "skuCode categoryName gsm qualityName widthInches");

  res.status(201).json({
    success: true,
    data: populatedOrder,
  });
});

// Confirm sales order with credit check
const confirmSalesOrder = handleAsyncErrors(async (req, res) => {
  const salesOrder = await SalesOrder.findById(req.params.id);

  if (!salesOrder) {
    throw new AppError("Sales order not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (salesOrder.status !== "Draft") {
    throw new AppError("Only draft sales orders can be confirmed", 400, "INVALID_STATE_TRANSITION");
  }

  // TODO: Implement credit check logic
  const creditCheckPassed = true; // Placeholder

  salesOrder.status = "Confirmed";
  salesOrder.creditCheckPassed = creditCheckPassed;
  salesOrder.confirmedBy = req.user ? req.user._id : undefined;
  salesOrder.confirmedAt = new Date();
  await salesOrder.save();

  res.json({
    success: true,
    data: salesOrder,
  });
});

// Calculate pricing for a sales order
const calculatePricing = handleAsyncErrors(async (req, res) => {
  const { customerId, lines } = req.body;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404, "RESOURCE_NOT_FOUND");
  }

  const processedLines = [];

  for (const line of lines) {
    const sku = await SKU.findById(line.skuId);
    if (!sku) {
      throw new AppError(`SKU not found: ${line.skuId}`, 404, "RESOURCE_NOT_FOUND");
    }

    const pricing = pricingService.calculateSalesPricing(
      customer.baseRate44,
      sku.widthInches,
      line.lengthMetersPerRoll,
      line.qtyRolls,
      line.overrideRatePerRoll
    );

    processedLines.push({
      skuId: line.skuId,
      categoryName: sku.categoryName,
      gsm: sku.gsm,
      qualityName: sku.qualityName,
      widthInches: sku.widthInches,
      lengthMetersPerRoll: line.lengthMetersPerRoll,
      qtyRolls: line.qtyRolls,
      totalMeters: line.qtyRolls * line.lengthMetersPerRoll,
      derivedRatePerRoll: pricing.derivedRatePerRoll,
      overrideRatePerRoll: line.overrideRatePerRoll,
      finalRatePerRoll: pricing.finalRatePerRoll,
      requiresApproval: pricing.requiresApproval,
    });
  }

  res.json({
    success: true,
    data: {
      customerBaseRate44: customer.baseRate44,
      lines: processedLines,
    },
  });
});

module.exports = {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  confirmSalesOrder,
  calculatePricing,
};
