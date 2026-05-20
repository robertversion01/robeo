'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const BRAND_CHIPS = ['Nike', 'Zara', 'H&M', 'Adidas', 'Levi\'s', 'Mango'];
const CONDITION_CHIPS = [
  { id: 'new', labelKey: 'browse.discovery.conditionNew' },
  { id: 'like_new', labelKey: 'browse.discovery.conditionLikeNew' },
  { id: 'good', labelKey: 'browse.discovery.conditionGood' },
] as const;

type Props = {
  browsePath?: string;
  onBrandPick?: (brand: string) => void;
  onConditionPick?: (condition: string) => void;
  className?: string;
};

export default function BrowseDiscoveryRails({
  browsePath = '/browse',
  onBrandPick,
  onConditionPick,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn('mb-3 space-y-2.5', className)}>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.discovery.brands')}
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {BRAND_CHIPS.map((brand) =>
            onBrandPick ? (
              <button
                key={brand}
                type="button"
                onClick={() => onBrandPick(brand)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#007782]/40 hover:text-[#007782]"
              >
                {brand}
              </button>
            ) : (
              <Link
                key={brand}
                href={`${browsePath}?brand=${encodeURIComponent(brand)}#catalog`}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#007782]/40 hover:text-[#007782]"
              >
                {brand}
              </Link>
            ),
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.discovery.condition')}
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CONDITION_CHIPS.map((c) =>
            onConditionPick ? (
              <button
                key={c.id}
                type="button"
                onClick={() => onConditionPick(c.id)}
                className="shrink-0 rounded-full border border-[#007782]/20 bg-[#007782]/5 px-3 py-1.5 text-xs font-medium text-[#007782]"
              >
                {t(c.labelKey)}
              </button>
            ) : (
              <Link
                key={c.id}
                href={`${browsePath}?condition=${c.id}#catalog`}
                className="shrink-0 rounded-full border border-[#007782]/20 bg-[#007782]/5 px-3 py-1.5 text-xs font-medium text-[#007782]"
              >
                {t(c.labelKey)}
              </Link>
            ),
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{t('browse.discovery.tip')}</p>
    </div>
  );
}
