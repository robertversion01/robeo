/**
 * Vinted HU-stílusú vevővédelmi díj (v1 kanonikus).
 * - fix 280 Ft
 * - + 5% a termék / ajánlati árára
 */
const BUYER_PROTECTION_BASE_HUF = 280;

export function calculateBuyerProtection(priceHuf: number): number {
  const base = Math.max(0, Math.round(priceHuf));
  const percentPart = Math.round(base * 0.05);
  return BUYER_PROTECTION_BASE_HUF + percentPart;
}

export function buyerProtectionFeeLabel(priceHuf: number): string {
  const percentPart = Math.round(Math.max(0, priceHuf) * 0.05);
  return `280 Ft + 5% (${percentPart.toLocaleString('hu-HU')} Ft)`;
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
