/** Közös ajánlat-státusz megjelenítés (eladó / vevő nézet) — Vinted dark */

export const OFFER_BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-950/50 text-amber-300 border-amber-900/45',
  accepted: 'bg-emerald-950/50 text-emerald-300 border-emerald-900/45',
  rejected: 'bg-red-950/50 text-red-300 border-red-900/45',
  countered: 'bg-indigo-950/50 text-indigo-300 border-indigo-900/45',
  payment_pending: 'bg-sky-950/50 text-sky-300 border-sky-900/45',
  payment_completed: 'bg-teal-950/50 text-teal-300 border-teal-900/45',
  completed: 'bg-[#1a2328] text-[#b2c0c6] border-[#2a3941]',
  cancelled: 'bg-[#141d21] text-[#8fa3ad] border-[#2a3941]',
};

export const OFFER_LABELS_SELLER: Record<string, string> = {
  pending: 'Függőben — válasz szükséges',
  accepted: 'Elfogadva',
  rejected: 'Elutasítva',
  countered: 'Ellenajánlat küldve',
  payment_pending: 'Fizetés folyamatban',
  payment_completed: 'Kifizetve',
  completed: 'Lezárva',
  cancelled: 'Visszavonva',
};

export const OFFER_LABELS_BUYER: Record<string, string> = {
  pending: 'Az eladó döntésére vár',
  accepted: 'Elfogadva — fizetés',
  rejected: 'Elutasítva',
  countered: 'Ellenajánlat az eladótól',
  payment_pending: 'Fizetés folyamatban',
  payment_completed: 'Kifizetve',
  completed: 'Lezárva',
  cancelled: 'Visszavonva',
};

export function offerBadgeClass(status: string): string {
  return (
    OFFER_BADGE_STYLES[status] ?? 'bg-[#141d21] text-[#b2c0c6] border-[#2a3941]'
  );
}
