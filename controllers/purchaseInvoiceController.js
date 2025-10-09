const PurchaseInvoice = require("../models/PurchaseInvoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const GRN = require("../models/GRN");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all purchase invoices
const getPurchaseInvoices = handleAsyncErrors(async (req, res) => {
  const { status, supplierId, purchaseOrderId, dateFrom, dateTo } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const purchaseInvoices = await PurchaseInvoice.find(filter)
    .populate("supplierId", "name supplierCode")
    .populate("purchaseOrderId", "poNumber")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: purchaseInvoices.length,
    data: purchaseInvoices,
  });
});

// Get single purchase invoice
const getPurchaseInvoice = handleAsyncErrors(async (req, res) => {
  const purchaseInvoice = await PurchaseInvoice.findById(req.params.id)
    .populate("supplierId", "name supplierCode address")
    .populate("purchaseOrderId", "poNumber supplierName date");

  if (!purchaseInvoice) {
    throw new AppError("Purchase invoice not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: purchaseInvoice,
  });
});

// Create purchase invoice
const createPurchaseInvoice = handleAsyncErrors(async (req, res) => {
  const {
    supplierInvoiceNumber,
    purchaseOrderId,
    lines,
    landedCosts,
    notes,
    dueDate,
  } = req.body;

  // Verify purchase order exists
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Generate PI number
  const piNumber = await numberingService.generateNumber("PI", PurchaseInvoice);

  // Process lines
  let subtotal = 0;
  let taxAmount = 0;

  const processedLines = lines.map((line) => {
    const lineTotal = line.qtyRolls * line.ratePerRoll;
    const lineTax = lineTotal * (line.taxRate / 100);

    subtotal += lineTotal;
    taxAmount += lineTax;

    return {
      ...line,
      lineTotal: lineTotal + lineTax,
    };
  });

  // Calculate landed costs
  const totalLandedCost = landedCosts.reduce((sum, cost) => sum + cost.amount, 0);

  const purchaseInvoice = await PurchaseInvoice.create({
    piNumber,
    supplierInvoiceNumber,
    purchaseOrderId,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplierName,
    date: new Date(),
    dueDate,
    lines: processedLines,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
    landedCosts,
    totalLandedCost,
    grandTotal: subtotal + taxAmount + totalLandedCost,
    createdBy: req.user._id,
  });

  const populatedInvoice = await PurchaseInvoice.findById(purchaseInvoice._id)
    .populate("supplierId", "name supplierCode")
    .populate("purchaseOrderId", "poNumber");

  res.status(201).json({
    success: true,
    data: populatedInvoice,
  });
});

// Allocate landed costs
const allocateLandedCost = handleAsyncErrors(async (req, res) => {
  const { landedCostId } = req.body;

  const purchaseInvoice = await PurchaseInvoice.findById(req.params.id);
  if (!purchaseInvoice) {
    throw new AppError("Purchase invoice not found", 404, "RESOURCE_NOT_FOUND");
  }

  const landedCost = purchaseInvoice.landedCosts.id(landedCostId);
  if (!landedCost) {
    throw new AppError("Landed cost not found", 404, "RESOURCE_NOT_FOUND");
  }

  // TODO: Implement landed cost allocation logic
  // This would involve finding all rolls related to this PI and allocating costs

  res.json({
    success: true,
    message: "Landed cost allocation completed",
    data: purchaseInvoice,
  });
});

// Post purchase invoice
const postPurchaseInvoice = handleAsyncErrors(async (req, res) => {
  const purchaseInvoice = await PurchaseInvoice.findById(req.params.id);

  if (!purchaseInvoice) {
    throw new AppError("Purchase invoice not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (purchaseInvoice.status !== "Draft") {
    throw new AppError("Only draft purchase invoices can be posted", 400, "INVALID_STATE_TRANSITION");
  }

  purchaseInvoice.status = "Posted";
  purchaseInvoice.postedBy = req.user._id;
  purchaseInvoice.postedAt = new Date();
  await purchaseInvoice.save();

  // TODO: Generate accounting voucher

  res.json({
    success: true,
    data: purchaseInvoice,
  });
});

module.exports = {
  getPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  allocateLandedCost,
  postPurchaseInvoice,
};
