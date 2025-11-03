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
    const qty = Number(qtyRolls) || 0;
    const override = overrideRate !== undefined && overrideRate !== null
      ? Number(overrideRate)
      : undefined;

    const finalRatePerRoll =
      typeof override === "number" && !Number.isNaN(override)
        ? override
        : derivedRatePerRoll;

    const requiresApproval = this.requiresApproval(derivedRatePerRoll, override);

    // Return subtotal in lineTotal; controller adds tax separately
    const lineSubtotal = finalRatePerRoll * qty;

    return {
      derivedRatePerRoll,
      overrideRatePerRoll: override ?? null,
      finalRatePerRoll,
      requiresApproval,
      lineTotal: lineSubtotal,
    };
  }
}

module.exports = new PricingService();
