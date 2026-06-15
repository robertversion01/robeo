import type { TFunction } from 'i18next';

export type PaymentPreset = {
  id: string;
  messageKey: string;
};

export const PAYMENT_CHAT_PRESETS: PaymentPreset[] = [
  { id: 'cash', messageKey: 'bp.payment.cash' },
  { id: 'revolut', messageKey: 'bp.payment.revolut' },
  { id: 'transfer', messageKey: 'bp.payment.transfer' },
  { id: 'pickup', messageKey: 'bp.payment.pickup' },
];

export function resolvePaymentPresetMessage(t: TFunction, preset: PaymentPreset): string {
  return t(preset.messageKey);
}
