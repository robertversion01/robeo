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
  dispute_open: 'Vitatás alatt',
};

export const TX_STATUS_MESSAGES: Record<string, string> = {
  feladva:
    '📦 Az eladó feladta a „{product}” csomagját. Hamarosan útnak indul (Foxpost szimuláció).',
  uton: '🚚 A „{product}” csomagod úton van — a futárszolgálat szállítja.',
  atvetelre_var:
    '📬 A „{product}” megérkezett az átvételi pontra / címre. Vevő: erősítsd meg, ha minden rendben!',
  sikeresen_atveve:
    '✅ A vevő megerősítette a „{product}” átvételét. A pénz felszabadult az eladónak.',
};

/** Eladói rendszerüzenetek (ugyanazon státuszokhoz). */
export const TX_STATUS_MESSAGES_SELLER: Record<string, string> = {
  feladva:
    '📦 Te jelölted feladottnak a „{product}” csomagot. A futár hamarosan átveszi (Foxpost).',
  uton: '🚚 A „{product}” csomagod úton van a vevő felé.',
  atvetelre_var:
    '📬 A „{product}” megérkezett a vevőhöz — várakozás az átvétel megerősítésére.',
  sikeresen_atveve:
    '✅ A vevő átvette a „{product}” terméket. A pénz hamarosan megérkezik a számládra.',
};
