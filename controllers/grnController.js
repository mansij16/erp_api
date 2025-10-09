const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Roll = require("../models/Roll");
const numberingService = require("../services/numberingService");
const { handleAsyncErrors, AppError } = require("../utils/errorHandler");

// Get all GRNs
const getGRNs = handleAsyncErrors(async (req, res) => {
  const { status, purchaseOrderId, supplierId, dateFrom, dateTo } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (supplierId) filter.supplierId = supplierId;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  const grns = await GRN.find(filter)
    .populate("purchaseOrderId", "poNumber supplierName")
    .populate("supplierId", "name supplierCode")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: grns.length,
    data: grns,
  });
});

// Get single GRN
const getGRN = handleAsyncErrors(async (req, res) => {
  const grn = await GRN.findById(req.params.id)
    .populate("purchaseOrderId", "poNumber supplierName date lines")
    .populate("supplierId", "name supplierCode address");

  if (!grn) {
    throw new AppError("GRN not found", 404, "RESOURCE_NOT_FOUND");
  }

  res.json({
    success: true,
    data: grn,
  });
});

// Create GRN
const createGRN = handleAsyncErrors(async (req, res) => {
  const { purchaseOrderId, lines, notes } = req.body;

  // Verify purchase order exists
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new AppError("Purchase order not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (purchaseOrder.status !== "Approved") {
    throw new AppError("Only approved purchase orders can receive GRN", 400, "INVALID_STATE_TRANSITION");
  }

  // Generate GRN number
  const grnNumber = await numberingService.generateNumber("GRN", GRN);

  // Process lines and create rolls
  const processedLines = [];
  const rollsToCreate = [];

  for (const line of lines) {
    const poLine = purchaseOrder.lines.id(line.poLineId);
    if (!poLine) {
      throw new AppError(`PO line not found: ${line.poLineId}`, 400, "VALIDATION_ERROR");
    }

    // Create rolls for received quantity
    for (let i = 0; i < line.qtyReceived; i++) {
      const rollNumber = numberingService.generateRollNumber(
        purchaseOrder.supplierId.toString(),
        "BATCH001", // TODO: Get from actual batch
        i + 1
      );

      rollsToCreate.push({
        rollNumber,
        skuId: poLine.skuId,
        batchId: null, // TODO: Link to actual batch
        supplierId: purchaseOrder.supplierId,
        categoryName: poLine.categoryName,
        gsm: poLine.gsm,
        qualityName: poLine.qualityName,
        widthInches: poLine.widthInches,
        lengthMeters: 1000, // TODO: Get from SKU default or user input
        status: "Unmapped",
        purchaseOrderId: purchaseOrder._id,
      });
    }

    processedLines.push({
      poLineId: line.poLineId,
      skuId: poLine.skuId,
      qtyOrdered: poLine.qtyRolls,
      qtyReceived: line.qtyReceived,
      qtyAccepted: line.qtyAccepted || line.qtyReceived,
      qtyRejected: line.qtyRejected || 0,
      qtyUnmapped: line.qtyReceived - (line.qtyAccepted || line.qtyReceived),
      rollsCreated: [], // Will be populated after roll creation
    });
  }

  // Create rolls
  const createdRolls = await Roll.insertMany(rollsToCreate);

  // Update processed lines with roll IDs
  let rollIndex = 0;
  processedLines.forEach((line) => {
    const lineRolls = createdRolls.slice(rollIndex, rollIndex + line.qtyReceived);
    line.rollsCreated = lineRolls.map((roll) => roll._id);
    rollIndex += line.qtyReceived;
  });

  const grn = await GRN.create({
    grnNumber,
    purchaseOrderId,
    poNumber: purchaseOrder.poNumber,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplierName,
    lines: processedLines,
    notes,
    createdBy: req.user._id,
  });

  // Update purchase order received quantities
  for (const line of processedLines) {
    const poLine = purchaseOrder.lines.id(line.poLineId);
    poLine.receivedQty += line.qtyReceived;
  }
  await purchaseOrder.save();

  const populatedGRN = await GRN.findById(grn._id)
    .populate("purchaseOrderId", "poNumber supplierName")
    .populate("supplierId", "name supplierCode");

  res.status(201).json({
    success: true,
    data: populatedGRN,
  });
});

// Post GRN (finalize)
const postGRN = handleAsyncErrors(async (req, res) => {
  const grn = await GRN.findById(req.params.id);

  if (!grn) {
    throw new AppError("GRN not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (grn.status !== "Draft") {
    throw new AppError("Only draft GRNs can be posted", 400, "INVALID_STATE_TRANSITION");
  }

  grn.status = "Posted";
  grn.postedBy = req.user._id;
  grn.postedAt = new Date();
  await grn.save();

  res.json({
    success: true,
    data: grn,
  });
});

module.exports = {
  getGRNs,
  getGRN,
  createGRN,
  postGRN,
};
