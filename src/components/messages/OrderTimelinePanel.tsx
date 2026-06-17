'use client';

import { Check, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  isTimelineStepActive,
  isTimelineStepDone,
  orderTimelineI18nKey,
  resolveOrderTimelineStep,
  visibleTimelineSteps,
  type OrderTimelineContext,
  type OrderTimelineStepId,
} from '@/lib/orderTimeline';
import { cn } from '@/lib/utils';

type Props = {
  context: OrderTimelineContext;
  compact?: boolean;
  onStepClick?: (step: OrderTimelineStepId) => void;
};

export default function OrderTimelinePanel({ context, compact = false, onStepClick }: Props) {
  const { t } = useTranslation();
  const current = resolveOrderTimelineStep(context);
  const steps = visibleTimelineSteps().filter((s) => s !== 'disputed' || current === 'disputed');

  if (current === 'disputed') {
    return (
      <div className="rounded-lg border border-amber-900/45 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
        {t('orderTimeline.disputed')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', compact ? 'text-[10px]' : 'text-xs')}>
      <p className="font-semibold text-[#e7edf0] mb-1.5">{t('orderTimeline.title')}</p>
      <ol className="space-y-1">
        {steps.map((step) => {
          const done = isTimelineStepDone(current, step);
          const active = isTimelineStepActive(current, step);
          const clickable = Boolean(onStepClick) && (done || active);
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick?.(step)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left transition-colors',
                  clickable && 'hover:bg-[#007782]/5 cursor-pointer',
                  !clickable && 'cursor-default',
                  active && 'font-semibold text-[#007782]',
                  done && !active && 'text-[#8fa3ad]',
                  !done && !active && 'text-[#6b7d85]',
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <Check size={compact ? 12 : 14} className="text-emerald-600" />
                  ) : (
                    <Circle
                      size={compact ? 12 : 14}
                      className={active ? 'text-[#007782] fill-[#007782]/15' : 'text-[#6b7d85]'}
                    />
                  )}
                </span>
                <span>{t(orderTimelineI18nKey(step))}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
