const gsmService = require("../services/gsmService");
const catchAsync = require("../utils/catchAsync");

class GsmController {
  createGSM = catchAsync(async (req, res) => {
    const gsm = await gsmService.createGSM(req.body);

    res.status(201).json({
      success: true,
      message: "GSM created successfully",
      data: gsm,
    });
  });

  getAllGSMs = catchAsync(async (req, res) => {
    const filters = {
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
    };

    const gsms = await gsmService.getAllGSMs(filters);

    res.status(200).json({
      success: true,
      count: gsms.length,
      data: gsms,
    });
  });

  getGSMById = catchAsync(async (req, res) => {
    const gsm = await gsmService.getGSMById(req.params.id);

    res.status(200).json({
      success: true,
      data: gsm,
    });
  });

  updateGSM = catchAsync(async (req, res) => {
    const gsm = await gsmService.updateGSM(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "GSM updated successfully",
      data: gsm,
    });
  });

  toggleGSMStatus = catchAsync(async (req, res) => {
    const gsm = await gsmService.toggleGSMStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `GSM ${gsm.active ? "activated" : "deactivated"} successfully`,
      data: gsm,
    });
  });

  deleteGSM = catchAsync(async (req, res) => {
    await gsmService.deleteGSM(req.params.id);

    res.status(200).json({
      success: true,
      message: "GSM deleted successfully",
    });
  });
}

module.exports = new GsmController();

