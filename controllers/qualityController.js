const qualityService = require("../services/qualityService");
const catchAsync = require("../utils/catchAsync");

class QualityController {
  createQuality = catchAsync(async (req, res) => {
    const quality = await qualityService.createQuality(req.body);

    res.status(201).json({
      success: true,
      message: "Quality created successfully",
      data: quality,
    });
  });

  getAllQualities = catchAsync(async (req, res) => {
    const filters = {
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
    };

    const qualities = await qualityService.getAllQualities(filters);

    res.status(200).json({
      success: true,
      count: qualities.length,
      data: qualities,
    });
  });

  getQualityById = catchAsync(async (req, res) => {
    const quality = await qualityService.getQualityById(req.params.id);

    res.status(200).json({
      success: true,
      data: quality,
    });
  });

  updateQuality = catchAsync(async (req, res) => {
    const quality = await qualityService.updateQuality(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Quality updated successfully",
      data: quality,
    });
  });

  toggleQualityStatus = catchAsync(async (req, res) => {
    const quality = await qualityService.toggleQualityStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `Quality ${
        quality.active ? "activated" : "deactivated"
      } successfully`,
      data: quality,
    });
  });

  deleteQuality = catchAsync(async (req, res) => {
    await qualityService.deleteQuality(req.params.id);

    res.status(200).json({
      success: true,
      message: "Quality deleted successfully",
    });
  });
}

module.exports = new QualityController();

