const pricingService = require("../services/pricingService");
const catchAsync = require("../utils/catchAsync");

class PricingController {
  calculatePrice = catchAsync(async (req, res) => {
    const { customerId, productId, widthInches, quantityRolls, lengthMeters } =
      req.body;

    const result = await pricingService.calculatePrice(
      customerId,
      productId,
      parseInt(widthInches),
      parseInt(quantityRolls),
      lengthMeters ? parseInt(lengthMeters) : undefined
    );

    res.status(200).json({ success: true, data: result });
  });

  applyOverride = catchAsync(async (req, res) => {
    const { originalPrice, overrideRate44, widthInches, reason } = req.body;
    const userId = req.user?.id || null;

    const result = await pricingService.applyOverrideRate(
      originalPrice,
      parseInt(overrideRate44),
      parseInt(widthInches),
      reason,
      userId
    );

    res.status(200).json({ success: true, data: result });
  });

  getPriceMatrix = catchAsync(async (req, res) => {
    const { customerId } = req.params;
    const matrix = await pricingService.getCustomerPriceMatrix(customerId);
    res.status(200).json({ success: true, data: matrix });
  });

  calculateDealRate = catchAsync(async (req, res) => {
    const { customerId, items, dealDiscount } = req.body;
    const result = await pricingService.calculateDealRate(
      customerId,
      items,
      parseInt(dealDiscount)
    );
    res.status(200).json({ success: true, data: result });
  });

  bulkRevision = catchAsync(async (req, res) => {
    const { customerId, revisionType, value, productIds } = req.body;
    const updates = await pricingService.bulkRateRevision(
      customerId,
      revisionType,
      parseInt(value),
      productIds || null
    );
    res
      .status(200)
      .json({ success: true, message: "Bulk rate revision applied", data: updates });
  });
}

module.exports = new PricingController();


