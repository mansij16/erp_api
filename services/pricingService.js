// services/pricingService.js
const CustomerRate = require("../models/CustomerRate");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");

class PricingService {
  /**
   * Lightweight sales pricing calculation given base rate and dimensions.
   * Mirrors UI logic (44" benchmark -> derived, final, line total).
   */
  calculateSalesPricing(
    baseRate44,
    widthInches,
    lengthMetersPerRoll,
    qtyRolls,
    overrideRatePerRoll
  ) {
    const width = Number(widthInches) || 0;
    const qty = Number(qtyRolls) || 0;
    const length = Number(lengthMetersPerRoll) || 0;
    const base = Number(baseRate44) || 0;

    const derivedRatePerRoll =
      width > 0 ? Math.round(base * (width / 44)) : 0;
    const finalRatePerRoll =
      overrideRatePerRoll !== undefined && overrideRatePerRoll !== null
        ? Number(overrideRatePerRoll) || 0
        : derivedRatePerRoll;

    const lineTotal = finalRatePerRoll * qty; // tax handled by caller

    return {
      derivedRatePerRoll,
      finalRatePerRoll,
      lineTotal,
      totalMeters: length * qty,
    };
  }

  /**
   * Calculate price based on 44" benchmark
   */
  async calculatePrice(
    customerId,
    productId,
    widthInches,
    quantityRolls,
    lengthMeters = 1000
  ) {
    // Get active rate for customer-product
    const rate = await CustomerRate.getActiveRate(customerId, productId);

    if (!rate) {
      throw new AppError(
        "No rate defined for this customer-product combination",
        404
      );
    }

    // Calculate rate for specific width
    const ratePerRoll = this.calculateWidthRate(rate.baseRate44, widthInches);

    // Calculate totals
    const subtotal = ratePerRoll * quantityRolls;

    // Get product for tax rate
    const product = await Product.findById(productId).populate("category");
    const taxRate = product.category.defaultTaxRate || 18;
    const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    return {
      baseRate44: rate.baseRate44,
      widthInches,
      lengthMeters,
      quantityRolls,
      ratePerRoll,
      subtotal,
      taxRate,
      taxAmount,
      total,
      rateId: rate._id,
      formula: `₹${rate.baseRate44} × (${widthInches}/44) = ₹${ratePerRoll}`,
    };
  }

  /**
   * Calculate rate for any width based on 44" benchmark
   */
  calculateWidthRate(baseRate44, widthInches) {
    const calculatedRate = baseRate44 * (widthInches / 44);
    return Math.round(calculatedRate); // Round to nearest rupee
  }

  /**
   * Apply override rate with validation
   */
  async applyOverrideRate(
    originalPrice,
    overrideRate44,
    widthInches,
    reason,
    userId
  ) {
    const overrideRatePerRoll = this.calculateWidthRate(
      overrideRate44,
      widthInches
    );
    const originalRatePerRoll = originalPrice.ratePerRoll;

    // Calculate deviation
    const deviation =
      Math.abs(overrideRatePerRoll - originalRatePerRoll) / originalRatePerRoll;
    const deviationPercent = Math.round(deviation * 100);

    // Check if approval needed (> 5% deviation)
    const requiresApproval = deviation > 0.05;

    return {
      originalRate44: originalPrice.baseRate44,
      overrideRate44,
      originalRatePerRoll,
      overrideRatePerRoll,
      deviation: deviationPercent,
      requiresApproval,
      reason,
      approvedBy: requiresApproval ? null : userId,
      status: requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
    };
  }

  /**
   * Get price matrix for a customer (all products and widths)
   */
  async getCustomerPriceMatrix(customerId) {
    const rates = await CustomerRate.find({
      customerId,
      active: true,
    }).populate({
      path: "productId",
      populate: [
        { path: "categoryId" },
        { path: "gsmId" },
        { path: "qualityId" },
      ],
    });

    const widths = [24, 36, 44, 63];
    const matrix = [];

    for (const rate of rates) {
      const productRates = {
        productId: rate.productId._id,
        productName: `${rate.productId.categoryId?.name || ""} ${rate.productId.gsmId?.name || ""} ${rate.productId.qualityId?.name || ""}`,
        baseRate44: rate.baseRate44,
        rates: {},
      };

      for (const width of widths) {
        productRates.rates[`w${width}`] = this.calculateWidthRate(
          rate.baseRate44,
          width
        );
      }

      matrix.push(productRates);
    }

    return matrix;
  }

  /**
   * Bulk rate revision
   */
  async bulkRateRevision(customerId, revisionType, value, productIds = null) {
    const query = { customerId, active: true };
    if (productIds) {
      query.productId = { $in: productIds };
    }

    const rates = await CustomerRate.find(query);
    const updates = [];

    for (const rate of rates) {
      let newRate44;

      if (revisionType === "PERCENTAGE") {
        // Percentage increase/decrease
        newRate44 = Math.round(rate.baseRate44 * (1 + value / 100));
      } else if (revisionType === "FLAT") {
        // Flat increase/decrease per meter
        newRate44 = rate.baseRate44 + value;
      } else {
        throw new AppError("Invalid revision type", 400);
      }

      updates.push({
        productId: rate.productId,
        oldRate44: rate.baseRate44,
        newRate44,
        change: newRate44 - rate.baseRate44,
        changePercent: Math.round(
          ((newRate44 - rate.baseRate44) / rate.baseRate44) * 100
        ),
      });

      // Deactivate old rate
      rate.active = false;
      rate.validTo = new Date();
      await rate.save();

      // Create new rate
      await CustomerRate.create({
        customerId,
        productId: rate.productId,
        baseRate44: newRate44,
        notes: `Bulk revision: ${revisionType} ${value}`,
      });
    }

    return updates;
  }

  /**
   * Calculate deal rate for special orders
   */
  async calculateDealRate(customerId, items, dealDiscount) {
    const pricing = [];
    let totalOriginal = 0;
    let totalDeal = 0;

    for (const item of items) {
      const originalPrice = await this.calculatePrice(
        customerId,
        item.productId,
        item.widthInches,
        item.quantity
      );

      const dealRate44 = Math.round(
        originalPrice.baseRate44 * (1 - dealDiscount / 100)
      );
      const dealRatePerRoll = this.calculateWidthRate(
        dealRate44,
        item.widthInches
      );
      const dealSubtotal = dealRatePerRoll * item.quantity;

      pricing.push({
        ...item,
        originalRate44: originalPrice.baseRate44,
        dealRate44,
        originalRatePerRoll: originalPrice.ratePerRoll,
        dealRatePerRoll,
        originalSubtotal: originalPrice.subtotal,
        dealSubtotal,
        savings: originalPrice.subtotal - dealSubtotal,
      });

      totalOriginal += originalPrice.subtotal;
      totalDeal += dealSubtotal;
    }

    return {
      items: pricing,
      totalOriginal,
      totalDeal,
      totalSavings: totalOriginal - totalDeal,
      savingsPercent: Math.round(
        ((totalOriginal - totalDeal) / totalOriginal) * 100
      ),
      dealDiscount,
    };
  }
}

module.exports = new PricingService();
