/** Vinted-szerű ajánlat lejárat — 24 óra. */
export const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export function offerExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + OFFER_TTL_MS).toISOString();
}

export function isOfferPastExpiry(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) <= Date.now();
}

export function offerRemainingMs(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

export function isOfferAwaitingAction(
  status: string,
  expiresAt: string | null | undefined,
): boolean {
  if (!['pending', 'countered'].includes(status)) return false;
  return !isOfferPastExpiry(expiresAt);
}

export function formatOfferRemaining(
  expiresAt: string | null | undefined,
  locale: string,
): string {
  const ms = offerRemainingMs(expiresAt);
  if (ms <= 0) return '';
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}${locale.startsWith('en') ? 'h' : 'ó'} ${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
  }
  return `${minutes}${locale.startsWith('en') ? 'm' : 'p'}`;
}
