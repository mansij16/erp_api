const PurchaseInvoice = require("../models/PurchaseInvoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const GRN = require("../models/GRN");
const Batch = require("../models/Batch");
const Roll = require("../models/Roll");
const Supplier = require("../models/Supplier");
const numberingService = require("../services/numberingService");
const { STATUS, PURCHASE_ORDER_STATUS } = require("../config/constants");
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
  // Atomic status transition to avoid duplicate posting/roll creation
  const updated = await PurchaseInvoice.findOneAndUpdate(
    { _id: req.params.id, status: STATUS.DRAFT },
    {
      status: STATUS.POSTED,
      postedBy: req.user?._id || undefined,
      postedAt: new Date(),
    },
    { new: true }
  );

  if (updated) {
    await createRollsForPurchaseInvoice(updated);
    await updatePurchaseOrderBalances(updated);
    return res.json({
      success: true,
      data: updated,
    });
  }

  // If not updated, fetch to determine state
  const existing = await PurchaseInvoice.findById(req.params.id);
  if (!existing) {
    throw new AppError("Purchase invoice not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (existing.status === STATUS.POSTED) {
    return res.json({
      success: true,
      data: existing,
      message: "Purchase invoice already posted",
    });
  }

  throw new AppError(
    "Only draft purchase invoices can be posted",
    400,
    "INVALID_STATE_TRANSITION"
  );

  // TODO: Generate accounting voucher

  res.json({
    success: true,
    data: purchaseInvoice,
  });
});

// Create rolls for a purchase invoice and update stock
const createRollsForPurchaseInvoice = async (purchaseInvoice) => {
  // Avoid duplicate roll creation if already processed for this PI
  const existingBatch = await Batch.findOne({
    purchaseInvoiceId: purchaseInvoice._id,
  });
  const existingRollsCount = existingBatch
    ? await Roll.countDocuments({ batchId: existingBatch._id })
    : 0;
  if (existingBatch && existingRollsCount > 0) return;

  const supplier = await Supplier.findById(purchaseInvoice.supplierId);
  if (!supplier) {
    throw new AppError("Supplier not found for purchase invoice", 404);
  }

  const batch =
    existingBatch ||
    (
      await Batch.create({
        supplierId: supplier._id,
        purchaseInvoiceId: purchaseInvoice._id,
        batchCode: numberingService.generateBatchCode(),
      })
    );

  const totalMetersAcrossLines = (purchaseInvoice.lines || []).reduce(
    (sum, line) => {
      const rollCount =
        Number(line.inwardRolls) ||
        Number(line.qtyRolls) ||
        Number(line.receivedQty) ||
        1;
      const perRollLength =
        Number(line.lengthMetersPerRoll) ||
        (Number(line.totalMeters) && rollCount
          ? Number(line.totalMeters) / rollCount
          : 0);
      const lineMeters = perRollLength * rollCount;
      return sum + (Number(lineMeters) || 0);
    },
    0
  );

  const overheadPerMeter =
    totalMetersAcrossLines > 0
      ? (purchaseInvoice.totalLandedCost || 0) / totalMetersAcrossLines
      : 0;

  const preparedRolls = [];

  for (const line of purchaseInvoice.lines || []) {
    // Use roll quantity from PI line: inwardRolls > qtyRolls > receivedQty > 1
    const rollCount =
      Number(line.inwardRolls) ||
      Number(line.qtyRolls) ||
      Number(line.receivedQty) ||
      1;
    const lengthPerRoll =
      Number(line.lengthMetersPerRoll) ||
      (Number(line.totalMeters) && rollCount
        ? Number(line.totalMeters) / rollCount
        : 0) ||
      0;
    const width = Number(line.widthInches || line.width || 0);

    if (!rollCount || !lengthPerRoll || ![24, 36, 44, 63].includes(width)) {
      continue;
    }

    const rate = Number(line.ratePerRoll) || 0;
    const baseCostPerMeter =
      lengthPerRoll > 0 ? rate / lengthPerRoll : 0;
    const landedCostPerMeter = baseCostPerMeter + overheadPerMeter;

    for (let i = 0; i < rollCount; i++) {
      const seq = preparedRolls.length + 1;
      const rollNumber = `${purchaseInvoice.piNumber}-R${String(seq).padStart(
        4,
        "0"
      )}`;

      preparedRolls.push({
        rollNumber,
        supplierId: supplier._id,
        batchId: batch._id,
        skuId: line.skuId || null,
        skuCode: line.skuCode,
        categoryName: line.categoryName,
        qualityName: line.qualityName,
        gsm: line.gsm,
        widthInches: width,
        originalLengthMeters: lengthPerRoll,
        currentLengthMeters: lengthPerRoll,
        status: line.skuId ? "Mapped" : "Unmapped",
        baseCostPerMeter,
        landedCostPerMeter,
        totalLandedCost:
          Math.round(landedCostPerMeter * lengthPerRoll * 100) / 100,
        poLineId: line.poLineId,
      });
    }
  }

  if (!preparedRolls.length) return;

  // If rolls already exist for this batch, skip creation (idempotent)
  const rollExists = existingBatch
    ? await Roll.exists({ batchId: existingBatch._id })
    : null;
  if (rollExists) return;

  await Roll.insertMany(preparedRolls);

  // Refresh batch roll count
  const rollCount = await Roll.countDocuments({ batchId: batch._id });
  batch.totalRolls = rollCount;
  await batch.save();
};

// Update PO line invoiced quantities and status after posting PI
const updatePurchaseOrderBalances = async (purchaseInvoice) => {
  if (!purchaseInvoice.purchaseOrderId) return;

  const po = await PurchaseOrder.findById(purchaseInvoice.purchaseOrderId);
  if (!po) return;

  let linesUpdated = false;
  const lines = po.lines || [];
  const piLines = purchaseInvoice.lines || [];

  // Map line updates by PO line id (rolls and meters)
  const updatesByLineId = new Map();
  const metersByLineId = new Map();

  // Build a lightweight matcher for PO lines in case poLineId is missing on PI lines
  const poLineByKey = new Map();
  lines.forEach((line) => {
    const keyParts = [
      line.skuId?.toString?.() || line.skuId || "",
      line.widthInches || "",
      line.gsm || "",
      line.qualityName || "",
    ];
    const key = keyParts.join("|");
    if (!poLineByKey.has(key)) {
      poLineByKey.set(key, line._id?.toString?.());
    }
  });

  piLines.forEach((line) => {
    let id = line.poLineId?.toString?.() || line.poLineId;
    if (!id) {
      const keyParts = [
        line.skuId?.toString?.() || line.skuId || "",
        line.widthInches || line.width || "",
        line.gsm || "",
        line.qualityName || "",
      ];
      const key = keyParts.join("|");
      id = poLineByKey.get(key);
    }
    if (!id) return;

    const rollCount =
      Number(line.inwardRolls) ||
      Number(line.qtyRolls) ||
      Number(line.receivedQty) ||
      0;
    const perRollMeters =
      Number(line.lengthMetersPerRoll) ||
      (rollCount > 0 && Number(line.totalMeters)
        ? Number(line.totalMeters) / rollCount
        : 0);
    const addMeters = perRollMeters * rollCount;

    const existing = updatesByLineId.get(id) || 0;
    updatesByLineId.set(id, existing + rollCount);

    const existingMeters = metersByLineId.get(id) || 0;
    metersByLineId.set(id, existingMeters + addMeters);
  });

  const updatedLines = lines.map((line) => {
    const id = line._id?.toString?.();
    if (!id) return line;
    const addRolls = updatesByLineId.get(id) || 0;
    const addMeters = metersByLineId.get(id) || 0;
    if (!addRolls && !addMeters) return line;

    const orderedRolls = Number(line.qtyRolls) || 0;
    const orderedMeters =
      Number(line.totalMeters) ||
      orderedRolls * (Number(line.lengthMetersPerRoll) || 0) ||
      0;

    const nextInvoiced = Math.min(
      (Number(line.invoicedQty) || 0) + addRolls,
      orderedRolls
    );
    const nextReceived = Math.min(
      (Number(line.receivedQty) || 0) + addRolls,
      orderedRolls
    );
    const nextReceivedMeters = Math.min(
      (Number(line.receivedMeters) || 0) + addMeters,
      orderedMeters
    );
    linesUpdated = true;
    const isComplete = nextReceived >= (Number(line.qtyRolls) || 0);
    return {
      ...(line.toObject?.() ? line.toObject() : line),
      invoicedQty: nextInvoiced,
      receivedQty: nextReceived,
      receivedMeters: nextReceivedMeters,
      lineStatus: isComplete ? "Complete" : "Pending",
    };
  });

  if (!linesUpdated) return;

  po.lines = updatedLines;

  // Aggregate received roll and meter totals
  const totals = updatedLines.reduce(
    (acc, l) => {
      acc.rolls += Number(l.receivedQty) || 0;
      acc.meters += Number(l.receivedMeters) || 0;
      return acc;
    },
    { rolls: 0, meters: 0 }
  );
  po.totalReceivedRolls = totals.rolls;
  po.totalReceivedMeters = totals.meters;

  const totalLines = updatedLines.length;
  const completeCount = updatedLines.filter(
    (l) => (l.lineStatus || "").toLowerCase() === "complete"
  ).length;

  if (totalLines > 0 && completeCount === totalLines) {
    po.poStatus = PURCHASE_ORDER_STATUS.COMPLETE;
  } else if (completeCount > 0) {
    po.poStatus = PURCHASE_ORDER_STATUS.PARTIAL;
  } else {
    po.poStatus = PURCHASE_ORDER_STATUS.PENDING;
  }

  await po.save();
};

module.exports = {
  getPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  allocateLandedCost,
  postPurchaseInvoice,
};
