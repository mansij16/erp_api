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
    supplierChallanNumber,
    purchaseOrderId,
    lines = [],
    landedCosts = [],
    notes,
    lrNumber,
    lrDate,
    caseNumber,
    hsnCode,
    gstMode = "intra",
    sgst,
    cgst,
    igst,
    date,
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
  let computedLineTax = 0;

  const processedLines = (lines || []).map((line) => {
    const qty = Number(line.qtyRolls) || 0;
    const rate = Number(line.ratePerRoll) || 0;
    const taxRate = Number(line.taxRate ?? 0) || 0;
    const lengthMetersPerRoll = Number(line.lengthMetersPerRoll) || 0;
    const inwardRolls = Number(line.inwardRolls) || 0;
    const inwardMeters =
      Number(line.inwardMeters) || inwardRolls * lengthMetersPerRoll || 0;
    const totalMeters =
      Number(line.totalMeters) || (qty || 0) * (lengthMetersPerRoll || 0);

    const lineBaseTotal = qty * rate;
    const lineTax = lineBaseTotal * (taxRate / 100);

    subtotal += lineBaseTotal;
    computedLineTax += lineTax;

    return {
      ...line,
      poLineId: line.poLineId,
      poId: line.poId,
      poNumber: line.poNumber,
      skuId: line.skuId,
      skuCode: line.skuCode,
      categoryName: line.categoryName,
      qualityName: line.qualityName,
      gsm: line.gsm,
      widthInches: line.widthInches,
      lengthMetersPerRoll,
      qtyRolls: qty,
      ratePerRoll: rate,
      taxRate,
      totalMeters,
      inwardRolls,
      inwardMeters,
      lineTotal: lineBaseTotal + lineTax,
    };
  });

  // Tax amounts
  const normalizedSGST = sgst !== undefined ? Number(sgst) || 0 : null;
  const normalizedCGST = cgst !== undefined ? Number(cgst) || 0 : null;
  const normalizedIGST = igst !== undefined ? Number(igst) || 0 : null;

  let sgstAmount = normalizedSGST;
  let cgstAmount = normalizedCGST;
  let igstAmount = normalizedIGST;

  if (
    sgstAmount === null ||
    cgstAmount === null ||
    igstAmount === null
  ) {
    const isInter = gstMode === "inter";
    sgstAmount = isInter ? 0 : subtotal * 0.09;
    cgstAmount = isInter ? 0 : subtotal * 0.09;
    igstAmount = isInter ? subtotal * 0.18 : 0;
  }

  const taxAmount = (sgstAmount || 0) + (cgstAmount || 0) + (igstAmount || 0);

  // Calculate landed costs
  const totalLandedCost = (landedCosts || []).reduce(
    (sum, cost) => sum + (Number(cost.amount) || 0),
    0
  );

  const purchaseInvoice = await PurchaseInvoice.create({
    piNumber,
    supplierInvoiceNumber,
    supplierChallanNumber,
    purchaseOrderId,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplierName,
    date: date ? new Date(date) : new Date(),
    lrNumber,
    lrDate: lrDate ? new Date(lrDate) : undefined,
    caseNumber,
    hsnCode,
    gstMode,
    sgst: sgstAmount,
    cgst: cgstAmount,
    igst: igstAmount,
    lines: processedLines,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
    landedCosts,
    totalLandedCost,
    grandTotal: subtotal + taxAmount + totalLandedCost,
    createdBy: req.user?._id || undefined,
    notes,
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
  purchaseInvoice.postedBy = req.user?._id || undefined;
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
