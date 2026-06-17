'use client';

import { ShieldCheck, Lock, Truck, MapPin, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ROBEO_BP_MODE } from '@/lib/features';

type Variant = 'compact' | 'full';

type Props = {
  variant?: Variant;
  className?: string;
};

export default function TrustSafetyBlock({ variant = 'compact', className }: Props) {
  const { t } = useTranslation();

  // BP-modban a helyi atvetel a fokusz — a Stripe/szallitas uzenet felrevezeto lenne.
  const items = ROBEO_BP_MODE
    ? [
        { icon: ShieldCheck, title: t('trust.protection.title'), body: t('trust.protection.body') },
        { icon: MapPin, title: t('trust.local.title'), body: t('trust.local.body') },
        { icon: Flag, title: t('trust.report.title'), body: t('trust.report.body') },
      ]
    : [
        { icon: ShieldCheck, title: t('trust.protection.title'), body: t('trust.protection.body') },
        { icon: Lock, title: t('trust.secure.title'), body: t('trust.secure.body') },
        { icon: Truck, title: t('trust.shipping.title'), body: t('trust.shipping.body') },
      ];

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#007782]/15 bg-[#007782]/5 px-3 py-2.5 text-xs text-[#b2c0c6]',
          className,
        )}
      >
        <p className="font-semibold text-[#007782] mb-1">{t('trust.compactTitle')}</p>
        <p className="leading-relaxed">
          {ROBEO_BP_MODE ? t('trust.bpCompactBody') : t('trust.compactBody')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-2 sm:grid-cols-3', className)}>
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-[#2a3941] bg-[#1a2328] p-3 flex gap-2"
        >
          <item.icon size={18} className="shrink-0 text-[#007782] mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#e7edf0]">{item.title}</p>
            <p className="text-[11px] text-[#8fa3ad] mt-0.5 leading-relaxed">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
