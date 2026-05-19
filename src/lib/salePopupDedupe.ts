/** Munkamenet alatt egyszer jelenjen meg eladási popup termékenként (webhook + broadcast). */
const shownSaleProductIds = new Set<string>();

export function claimSalePopupSlot(productId: string): boolean {
  const key = productId?.trim() || '_unknown_product';
  if (shownSaleProductIds.has(key)) {
    return false;
  }
  shownSaleProductIds.add(key);
  return true;
}

export function hasSalePopupBeenShown(productId: string): boolean {
  const key = productId?.trim() || '_unknown_product';
  return shownSaleProductIds.has(key);
}
