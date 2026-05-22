import { isPaidStatus, isTerminalStatus, TX_STATUS } from '@/lib/transactionFlow';

/** Közös Vinted-szerű lépések — mindkét fél ugyanazt a folyamatot látja. */
export const ORDER_TIMELINE_STEP_IDS = [
  'offer_made',
  'offer_accepted',
  'payment_pending',
  'paid',
  'packing',
  'shipped',
  'in_transit',
  'ready_for_pickup',
  'completed',
  'disputed',
] as const;

export type OrderTimelineStepId = (typeof ORDER_TIMELINE_STEP_IDS)[number];

export type OrderTimelineContext = {
  offerStatus?: string | null;
  txStatus?: string | null;
  disputeStatus?: string | null;
};

const FLOW_STEPS: OrderTimelineStepId[] = [
  'offer_made',
  'offer_accepted',
  'payment_pending',
  'paid',
  'packing',
  'shipped',
  'in_transit',
  'ready_for_pickup',
  'completed',
];

export function resolveOrderTimelineStep(ctx: OrderTimelineContext): OrderTimelineStepId {
  if (ctx.disputeStatus) return 'disputed';

  const tx = ctx.txStatus || '';
  if (isTerminalStatus(tx) || tx === TX_STATUS.SIKERESEN_ATVEVE) return 'completed';
  if (tx === TX_STATUS.ATVETELRE_VAR || tx === 'delivered') return 'ready_for_pickup';
  if (tx === TX_STATUS.UTON) return 'in_transit';
  if (tx === TX_STATUS.FELADVA || tx === 'shipped') return 'shipped';
  if (isPaidStatus(tx)) return 'packing';

  const offer = ctx.offerStatus || '';
  if (offer === 'accepted') return 'payment_pending';
  if (offer === 'pending' || offer === 'countered') return 'offer_made';

  return 'offer_made';
}

export function timelineStepIndex(step: OrderTimelineStepId): number {
  if (step === 'disputed') return FLOW_STEPS.length;
  const idx = FLOW_STEPS.indexOf(step);
  return idx >= 0 ? idx : 0;
}

export function isTimelineStepDone(current: OrderTimelineStepId, step: OrderTimelineStepId): boolean {
  if (current === 'disputed') return step !== 'disputed' && timelineStepIndex(step) <= timelineStepIndex('paid');
  return timelineStepIndex(step) < timelineStepIndex(current);
}

export function isTimelineStepActive(current: OrderTimelineStepId, step: OrderTimelineStepId): boolean {
  return current === step;
}

export function visibleTimelineSteps(): OrderTimelineStepId[] {
  return FLOW_STEPS;
}

export function orderTimelineI18nKey(step: OrderTimelineStepId): string {
  return `orderTimeline.steps.${step}`;
}
