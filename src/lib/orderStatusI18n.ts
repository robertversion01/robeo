/** DB / Stripe tranzakció státusz → i18n kulcs */
export function orderStatusI18nKey(status: string): string {
  const map: Record<string, string> = {
    payment_pending: 'orders.status.paymentPending',
    payment_failed: 'orders.status.paymentFailed',
    paid: 'orders.status.paid',
    fizetve: 'orders.status.paid',
    feladva: 'orders.status.shipped',
    uton: 'orders.status.inTransit',
    atvetelre_var: 'orders.status.readyForPickup',
    sikeresen_atveve: 'orders.status.completed',
    completed: 'orders.status.completed',
    refunded: 'orders.status.refunded',
    dispute_open: 'orders.status.disputeOpen',
  };
  return map[status] || 'orders.status.unknown';
}
