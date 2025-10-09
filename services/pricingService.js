class PricingService {
  calculateDerivedRate(baseRate44, targetWidth) {
    if (!baseRate44 || !targetWidth) return 0;
    const ratio = targetWidth / 44;
    const derivedRate = baseRate44 * ratio;
    return Math.round(derivedRate);
  }

  requiresApproval(derivedRate, overrideRate, tolerancePercent = 5) {
    if (!overrideRate) return false;
    const deviation =
      Math.abs((overrideRate - derivedRate) / derivedRate) * 100;
    return deviation > tolerancePercent;
  }

  calculateLineTotal(quantity, rate, taxRate = 18) {
    const subtotal = quantity * rate;
    const tax = (subtotal * taxRate) / 100;
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }

  calculateSalesPricing(baseRate44, targetWidth, lengthMeters, qtyRolls, overrideRate) {
    const derivedRatePerRoll = this.calculateDerivedRate(baseRate44, targetWidth);
    const finalRatePerRoll = overrideRate || derivedRatePerRoll;
    const requiresApproval = this.requiresApproval(derivedRatePerRoll, overrideRate);

    return {
      derivedRatePerRoll,
      overrideRatePerRoll,
      finalRatePerRoll,
      requiresApproval,
      lineTotal: finalRatePerRoll * qtyRolls * lengthMeters,
    };
  }
}

module.exports = new PricingService();
