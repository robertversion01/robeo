/** Foxpost / futár szimuláció — lépések közötti várakozás (ms). */
export const SHIPPING_SIMULATION_DELAY_MS = 10_000;

export const TX_STATUS = {
  FIZETVE: 'fizetve',
  FELADVA: 'feladva',
  UTON: 'uton',
  ATVETELRE_VAR: 'atvetelre_var',
  SIKERESEN_ATVEVE: 'sikeresen_atveve',
} as const;

const PAID_STATUSES = new Set(['fizetve', 'paid', 'payment_succeeded']);

const SELLER_WAIT_STATUSES = new Set<string>([
  TX_STATUS.FELADVA,
  TX_STATUS.UTON,
  TX_STATUS.ATVETELRE_VAR,
]);

export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status);
}

/** Eladó: egyetlen manuális lépés — csomag feladva. */
export function canSellerMarkShipped(status: string): boolean {
  return isPaidStatus(status);
}

/** Eladó: feladás után nincs gomb (automatikus szimuláció + várakozás). */
export function sellerShowsWaitingHint(status: string): boolean {
  return SELLER_WAIT_STATUSES.has(status);
}

/** Vevő: csak átvétel után erősíthet. */
export function canBuyerConfirmReceipt(status: string): boolean {
  return status === TX_STATUS.ATVETELRE_VAR || status === 'delivered';
}

export function isTerminalStatus(status: string): boolean {
  return (
    status === TX_STATUS.SIKERESEN_ATVEVE ||
    status === 'completed' ||
    status === 'funds_released' ||
    status === 'refunded'
  );
}

export const TX_STATUS_LABELS: Record<string, string> = {
  payment_pending: 'Fizetésre vár',
  payment_failed: 'Fizetés sikertelen',
  paid: 'Kifizetve',
  fizetve: 'Fizetve',
  feladva: 'Csomag feladva',
  uton: 'Úton (futár)',
  atvetelre_var: 'Átvételre vár',
  sikeresen_atveve: 'Sikeresen átvéve',
  shipped: 'Feladva',
  delivered: 'Kézbesítve',
  completed: 'Befejezve',
  refunded: 'Visszatérítve',
};

export const TX_STATUS_MESSAGES: Record<string, string> = {
  feladva: '📦 Az eladó feladta a csomagot. Hamarosan útnak indul (Foxpost szimuláció).',
  uton: '🚚 A csomag úton van — a futárszolgálat szállítja.',
  atvetelre_var:
    '📬 A csomag megérkezett az átvételi pontra / címre. Vevő: erősítsd meg, ha minden rendben!',
  sikeresen_atveve: '✅ A vevő megerősítette az átvételt. A pénz felszabadult az eladónak.',
};
