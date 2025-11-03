const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const SKU = require("../models/SKU");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all purchase orders
const getPurchaseOrders = handleAsyncErrors(async (req, res) => {
  const { status, supplierId, dateFrom, dateTo } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const purchaseOrders = await PurchaseOrder.find(filter)
    .populate("supplierId", "name supplierCode")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: purchaseOrders.length,
    data: purchaseOrders,
  });
});

// Get single purchase order
const getPurchaseOrder = handleAsyncErrors(async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id)
    .populate("supplierId", "name supplierCode address contactPersons")
    .populate(
      "lines.skuId",
      "skuCode categoryName gsm qualityName widthInches"
    );

  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: purchaseOrder,
  });
});

// Create purchase order
const createPurchaseOrder = handleAsyncErrors(async (req, res) => {
  const { supplierId, lines, notes } = req.body;

  // Verify supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError("Supplier not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Generate PO number
  const poNumber = await numberingService.generateNumber("PO", PurchaseOrder);

  // Calculate totals
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

  const purchaseOrder = await PurchaseOrder.create({
    poNumber,
    supplierId,
    supplierName: supplier.name,
    lines: processedLines,
    subtotal,
    taxAmount: taxAmount || 0,
    total: subtotal + taxAmount || 0,
    notes,
    createdBy: req.user._id || "Mansi",
  });

  const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
    .populate("supplierId", "name supplierCode")
    .populate(
      "lines.skuId",
      "skuCode categoryName gsm qualityName widthInches"
    );

  res.status(201).json({
    success: true,
    data: populatedOrder,
  });
});

// Update purchase order
const updatePurchaseOrder = handleAsyncErrors(async (req, res) => {
  const { lines, notes } = req.body;

  const purchaseOrder = await PurchaseOrder.findById(req.params.id);
  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Recalculate totals if lines are updated
  if (lines) {
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

    purchaseOrder.lines = processedLines;
    purchaseOrder.subtotal = subtotal;
    purchaseOrder.taxAmount = taxAmount || 0;
    purchaseOrder.total = subtotal + taxAmount || 0;
  }

  if (notes !== undefined) purchaseOrder.notes = notes;

  await purchaseOrder.save();

  const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
    .populate("supplierId", "name supplierCode")
    .populate(
      "lines.skuId",
      "skuCode categoryName gsm qualityName widthInches"
    );

  res.json({
    success: true,
    data: populatedOrder,
  });
});

// Approve purchase order
const approvePurchaseOrder = handleAsyncErrors(async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id);

  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (purchaseOrder.status !== "Draft") {
    throw new AppError(
      "Only draft purchase orders can be approved",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  purchaseOrder.status = "Approved";
  purchaseOrder.approvedBy = req.user._id;
  purchaseOrder.approvedAt = new Date();
  await purchaseOrder.save();

  res.json({
    success: true,
    data: purchaseOrder,
  });
});

// Close purchase order
const closePurchaseOrder = handleAsyncErrors(async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id);

  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (!["Approved", "PartiallyReceived"].includes(purchaseOrder.status)) {
    throw new AppError(
      "Only approved or partially received purchase orders can be closed",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  purchaseOrder.status = "Closed";
  await purchaseOrder.save();

  res.json({
    success: true,
    data: purchaseOrder,
  });
});

module.exports = {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  closePurchaseOrder,
};
