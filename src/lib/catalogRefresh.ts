/** Kliensoldali katalógus-frissítés (pl. sikeres checkout után). */
export const CATALOG_UPDATED_EVENT = 'products:updated';

export function notifyCatalogUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CATALOG_UPDATED_EVENT));
}
