const rollService = require("../services/rollService");
const catchAsync = require("../utils/catchAsync");

class RollController {
  createRolls = catchAsync(async (req, res) => {
    const rolls = req.body.rolls || req.body;
    const created = await rollService.createManualRolls(rolls);

    res.status(201).json({
      success: true,
      message: `${created.length} roll(s) created`,
      data: created,
    });
  });

  getAllRolls = catchAsync(async (req, res) => {
    const filters = {
      status: req.query.status,
      skuId: req.query.skuId,
      supplierId: req.query.supplierId,
      batchId: req.query.batchId,
      barcode: req.query.barcode,
      unmappedDays: req.query.unmappedDays
        ? parseInt(req.query.unmappedDays)
        : undefined,
    };

    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await rollService.getAllRolls(filters, pagination);

    res.status(200).json({
      success: true,
      ...result,
    });
  });

  getRollByBarcode = catchAsync(async (req, res) => {
    const roll = await rollService.getRollByBarcode(req.params.barcode);

    res.status(200).json({
      success: true,
      data: roll,
    });
  });

  mapUnmappedRolls = catchAsync(async (req, res) => {
    const results = await rollService.mapUnmappedRolls(req.body.mappings);

    res.status(200).json({
      success: true,
      message: "Roll mapping completed",
      data: results,
    });
  });

  allocateRolls = catchAsync(async (req, res) => {
    const { soLineId, quantity } = req.body;
    const allocatedRolls = await rollService.allocateRollsToOrder(
      soLineId,
      quantity,
      req.userId
    );

    res.status(200).json({
      success: true,
      message: `${allocatedRolls.length} rolls allocated successfully`,
      data: allocatedRolls,
    });
  });

  deallocateRolls = catchAsync(async (req, res) => {
    const result = await rollService.deallocateRolls(req.body.soLineId);

    res.status(200).json({
      success: true,
      message: "Rolls deallocated successfully",
      data: result,
    });
  });

  dispatchRolls = catchAsync(async (req, res) => {
    const { dcId, rollIds } = req.body;
    const dispatchedRolls = await rollService.dispatchRolls(
      dcId,
      rollIds,
      req.userId
    );

    res.status(200).json({
      success: true,
      message: `${dispatchedRolls.length} rolls dispatched successfully`,
      data: dispatchedRolls,
    });
  });

  handleReturn = catchAsync(async (req, res) => {
    const { rollId, remainingMeters, reason } = req.body;
    const result = await rollService.handleReturn(
      rollId,
      remainingMeters,
      reason,
      req.userId
    );

    res.status(200).json({
      success: true,
      message: "Return processed successfully",
      data: result,
    });
  });

  markAsScrap = catchAsync(async (req, res) => {
    const { reason } = req.body;
    const roll = await rollService.markAsScrap(
      req.params.id,
      reason,
      req.userId
    );

    res.status(200).json({
      success: true,
      message: "Roll marked as scrap",
      data: roll,
    });
  });

  getInventorySummary = catchAsync(async (req, res) => {
    const summary = await rollService.getInventorySummary();

    res.status(200).json({
      success: true,
      data: summary,
    });
  });

  getUnmappedRolls = catchAsync(async (req, res) => {
    const unmapped = await rollService.getUnmappedRolls();

    res.status(200).json({
      success: true,
      count: unmapped.length,
      data: unmapped,
    });
  });
}

module.exports = new RollController();
