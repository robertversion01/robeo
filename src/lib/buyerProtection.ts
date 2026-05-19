/**
 * Vinted HU-stílusú vevővédelmi díj (v1 kanonikus).
 * - 5% a termék / ajánlati árára
 * - minimum 200 Ft
 * - maximum 5000 Ft
 */
export function calculateBuyerProtection(priceHuf: number): number {
  const base = Math.max(0, Math.round(priceHuf));
  const fee = Math.round(base * 0.05);
  return Math.max(200, Math.min(5000, fee));
}

export function calculateCheckoutTotal(
  priceHuf: number,
  shippingCostHuf = 0,
): { buyerProtectionFee: number; shippingCost: number; total: number } {
  const buyerProtectionFee = calculateBuyerProtection(priceHuf);
  const shippingCost =
    typeof shippingCostHuf === 'number' && Number.isFinite(shippingCostHuf) && shippingCostHuf > 0
      ? Math.round(shippingCostHuf)
      : 0;
  const productPrice = Math.max(0, Math.round(priceHuf));
  return {
    buyerProtectionFee,
    shippingCost,
    total: productPrice + buyerProtectionFee + shippingCost,
  };
}
