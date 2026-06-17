'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Props = {
  value: 'all' | 'product' | 'service';
  onChange: (value: 'all' | 'product' | 'service') => void;
  className?: string;
};

/** Termék / szolgáltatás / mind szűrő — kompakt mobil tab. */
export default function ListingTypeToggle({ value, onChange, className }: Props) {
  const { t } = useTranslation();

  const options = [
    { id: 'all' as const, label: t('browse.listingType.all') },
    { id: 'product' as const, label: t('browse.listingType.products') },
    { id: 'service' as const, label: t('browse.listingType.services') },
  ];

  return (
    <div
      className={cn(
        'inline-flex rounded-full border border-[#2a3941] bg-[#121b20] p-0.5',
        className,
      )}
      role="tablist"
      aria-label={t('browse.listingType.label')}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition touch-manipulation whitespace-nowrap',
            value === opt.id
              ? 'bg-[#17343a] text-[#9be2e8] shadow-sm'
              : 'text-[#8fa3ad] hover:text-[#c5d0d6]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
