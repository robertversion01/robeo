/** Közös ajánlat-státusz megjelenítés (eladó / vevő nézet) */

export const OFFER_BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  countered: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  payment_pending: 'bg-sky-50 text-sky-800 border-sky-200',
  payment_completed: 'bg-teal-50 text-teal-800 border-teal-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
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
    OFFER_BADGE_STYLES[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  );
}
