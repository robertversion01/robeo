'use client';

import { useTranslation } from 'react-i18next';
import { ROBEO_BP_MODE } from '@/lib/features';
import { PAYMENT_CHAT_PRESETS, resolvePaymentPresetMessage } from '@/lib/paymentChatPresets';

type Props = {
  disabled?: boolean;
  onInsert: (text: string) => void;
};

export default function PaymentPresetChips({ disabled, onInsert }: Props) {
  const { t } = useTranslation();

  if (!ROBEO_BP_MODE) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {PAYMENT_CHAT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          onClick={() => onInsert(resolvePaymentPresetMessage(t, preset))}
          className="rounded-full border border-[#007782]/25 bg-[#007782]/5 px-2.5 py-1 text-[10px] font-semibold text-[#007782] hover:bg-[#007782]/10 disabled:opacity-50"
        >
          {t(`bp.payment.chip.${preset.id}`)}
        </button>
      ))}
    </div>
  );
}
