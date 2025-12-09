const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const SKU = require("../models/SKU");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");
const { STATUS, PURCHASE_ORDER_STATUS } = require("../config/constants");

// Get all purchase orders
const getPurchaseOrders = handleAsyncErrors(async (req, res) => {
  const { supplierId, dateFrom, dateTo } = req.query;

  const filter = {};
  // if (status) filter.status = status;
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

const sanitizeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₹,$,\s]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object" && typeof value.value === "number") {
    return value.value;
  }
  return Number(value) || 0;
};

const deriveOrderStatusFromLines = (lines = []) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return PURCHASE_ORDER_STATUS.DRAFT;
  }

  const completedCount = lines.filter(
    (line = {}) =>
      (line.lineStatus || line.status || "").toLowerCase() === "complete"
  ).length;
  const totalCount = lines.length;

  if (completedCount === totalCount) {
    return PURCHASE_ORDER_STATUS.COMPLETE;
  }

  if (completedCount > 0) {
    return PURCHASE_ORDER_STATUS.PARTIAL;
  }

  return PURCHASE_ORDER_STATUS.PENDING;
};

// Create purchase order
const createPurchaseOrder = handleAsyncErrors(async (req, res) => {
  const {
    supplierId,
    lines,
    notes,
    status: requestedStatusLegacy,
    poStatus: requestedPoStatus,
    saveAsDraft,
  } = req.body;

  // Verify supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new AppError("Supplier not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Generate PO number
  const poNumber = await numberingService.generateNumber("PO", PurchaseOrder);

  // Calculate totals
  let subtotal = 0;
  let totalMetersSum = 0;

  const processedLines = (lines || []).map((line = {}) => {
    const qtyRolls = sanitizeNumber(line.qtyRolls);
    const ratePerRoll = sanitizeNumber(line.ratePerRoll);
    const lengthMetersPerRoll = sanitizeNumber(line.lengthMetersPerRoll);
    const lineMeters = qtyRolls * lengthMetersPerRoll;
    const lineTotal = lineMeters * ratePerRoll;
    const lineStatus =
      typeof line.lineStatus === "string" && line.lineStatus.trim()
        ? line.lineStatus
        : typeof line.status === "string" && line.status.trim()
        ? line.status
        : "Pending";
    const { taxRate: _ignoredTaxRate, ...restLine } = line || {};

    subtotal += lineTotal;
    totalMetersSum += lineMeters;

    return {
      ...restLine,
      qtyRolls,
      ratePerRoll,
      lengthMetersPerRoll,
      totalMeters: lineMeters,
      lineTotal,
      lineStatus,
    };
  });

  // For create:
  // - If saveAsDraft true => Draft + all lines Pending
  // - Else => Pending + all lines Pending
  const headerStatus = saveAsDraft
    ? PURCHASE_ORDER_STATUS.DRAFT
    : PURCHASE_ORDER_STATUS.PENDING;
  const normalizedLinesForCreate = processedLines.map((line) => ({
    ...line,
    lineStatus: "Pending",
  }));

  const purchaseOrder = await PurchaseOrder.create({
    poNumber,
    supplierId,
    supplierName: supplier.name,
    lines: normalizedLinesForCreate,
    subtotal,
    totalAmount: subtotal,
    totalMeters: totalMetersSum,
    poStatus: headerStatus,
    notes,
    createdBy: req.user?._id,
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
  const {
    lines,
    notes,
    status: requestedStatusLegacy,
    poStatus: requestedPoStatus,
    saveAsDraft,
  } = req.body;

  const purchaseOrder = await PurchaseOrder.findById(req.params.id);
  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Recalculate totals if lines are updated
  if (lines) {
    let subtotal = 0;
    let totalMetersSum = 0;

    const processedLines = (lines || []).map((line = {}) => {
      const qtyRolls = sanitizeNumber(line.qtyRolls);
      const ratePerRoll = sanitizeNumber(line.ratePerRoll);
      const lengthMetersPerRoll = sanitizeNumber(line.lengthMetersPerRoll);
      const lineMeters = qtyRolls * lengthMetersPerRoll;
      const lineTotal = lineMeters * ratePerRoll;
    const lineStatus =
      typeof line.lineStatus === "string" && line.lineStatus.trim()
        ? line.lineStatus
        : typeof line.status === "string" && line.status.trim()
        ? line.status
        : "Pending";
      const { taxRate: _ignoredTaxRate, ...restLine } = line || {};

      subtotal += lineTotal;
      totalMetersSum += lineMeters;

      return {
        ...restLine,
        qtyRolls,
        ratePerRoll,
        lengthMetersPerRoll,
        totalMeters: lineMeters,
        lineTotal,
        lineStatus,
      };
    });

    purchaseOrder.lines = processedLines;
    purchaseOrder.subtotal = subtotal;
    purchaseOrder.totalAmount = subtotal;
    purchaseOrder.totalMeters = totalMetersSum;
  }

  const latestLines = purchaseOrder.lines || [];
  let headerStatus;
  if (saveAsDraft) {
    headerStatus = PURCHASE_ORDER_STATUS.DRAFT;
    purchaseOrder.lines = latestLines.map((line) => ({
      ...line,
      lineStatus: "Pending",
    }));
  } else {
    const requestedStatus = requestedPoStatus || requestedStatusLegacy;
    headerStatus = deriveOrderStatusFromLines(latestLines);

    // If a valid status is explicitly provided, let it override derived only when it's Draft/Pending/Partial/Complete
    if (
      Object.values(PURCHASE_ORDER_STATUS).includes(requestedStatus) &&
      ["Draft", "Pending", "Partial", "Complete"].includes(requestedStatus)
    ) {
      headerStatus = requestedStatus;
    }
  }
  purchaseOrder.poStatus = headerStatus;

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

  if (purchaseOrder.poStatus !== PURCHASE_ORDER_STATUS.DRAFT) {
    throw new AppError(
      "Only draft purchase orders can be approved",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  purchaseOrder.poStatus = PURCHASE_ORDER_STATUS.APPROVED;
  purchaseOrder.approvedBy = req.user?._id;
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

  if (
    ![
      PURCHASE_ORDER_STATUS.APPROVED,
      PURCHASE_ORDER_STATUS.PARTIAL,
      "PartiallyReceived",
    ].includes(purchaseOrder.poStatus)
  ) {
    throw new AppError(
      "Only approved or partially received purchase orders can be closed",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  purchaseOrder.poStatus = PURCHASE_ORDER_STATUS.CLOSED;
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
