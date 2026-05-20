'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PRICE_RAIL_CHIPS } from '@/lib/discoveryStats';

const FALLBACK_BRANDS = ['Nike', 'Zara', 'H&M', 'Adidas', 'Levi\'s', 'Mango'];
const FALLBACK_SIZES = ['XS', 'S', 'M', 'L', 'XL', '38', '40', '42'];
const CONDITION_CHIPS = [
  { id: 'new', labelKey: 'browse.discovery.conditionNew' },
  { id: 'like_new', labelKey: 'browse.discovery.conditionLikeNew' },
  { id: 'good', labelKey: 'browse.discovery.conditionGood' },
] as const;

type Props = {
  browsePath?: string;
  brandChips?: string[];
  sizeChips?: string[];
  prefBrands?: string[];
  compact?: boolean;
  onBrandPick?: (brand: string) => void;
  onSizePick?: (size: string) => void;
  onConditionPick?: (condition: string) => void;
  onSortPick?: (sort: string) => void;
  onMaxPricePick?: (max: number) => void;
  className?: string;
};

export default function BrowseDiscoveryRails({
  browsePath = '/browse',
  brandChips,
  sizeChips,
  prefBrands = [],
  compact = false,
  onBrandPick,
  onSizePick,
  onConditionPick,
  onSortPick,
  onMaxPricePick,
  className,
}: Props) {
  const { t } = useTranslation();
  const brands = [...new Set([...prefBrands, ...(brandChips?.length ? brandChips : FALLBACK_BRANDS)])].slice(
    0,
    10,
  );
  const sizes = (sizeChips?.length ? sizeChips : FALLBACK_SIZES).slice(0, 10);

  const chipClass =
    'shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-[#007782]/40 hover:text-[#007782]';

  return (
    <div className={cn(compact ? 'mb-2 space-y-2' : 'mb-3 space-y-2.5', className)}>
      {prefBrands.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#007782]">
            {t('browse.discovery.forYou')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {prefBrands.map((brand) =>
              onBrandPick ? (
                <button key={`pref-${brand}`} type="button" onClick={() => onBrandPick(brand)} className={cn(chipClass, 'border-[#007782]/30 bg-[#007782]/5 text-[#007782]')}>
                  {brand}
                </button>
              ) : (
                <Link key={`pref-${brand}`} href={`${browsePath}?brand=${encodeURIComponent(brand)}#catalog`} className={cn(chipClass, 'border-[#007782]/30 bg-[#007782]/5 text-[#007782]')}>
                  {brand}
                </Link>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.discovery.brands')}
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {brands.map((brand) =>
            onBrandPick ? (
              <button key={brand} type="button" onClick={() => onBrandPick(brand)} className={chipClass}>
                {brand}
              </button>
            ) : (
              <Link key={brand} href={`${browsePath}?brand=${encodeURIComponent(brand)}#catalog`} className={chipClass}>
                {brand}
              </Link>
            ),
          )}
        </div>
      </div>

      {!compact ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {t('browse.discovery.sizes')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {sizes.map((size) =>
              onSizePick ? (
                <button key={size} type="button" onClick={() => onSizePick(size)} className={chipClass}>
                  {size}
                </button>
              ) : (
                <Link key={size} href={`${browsePath}?size=${encodeURIComponent(size)}#catalog`} className={chipClass}>
                  {size}
                </Link>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.discovery.price')}
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {PRICE_RAIL_CHIPS.map((p) =>
            onMaxPricePick ? (
              <button
                key={p.id}
                type="button"
                onClick={() => onMaxPricePick(p.max)}
                className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
              >
                {t(p.labelKey)}
              </button>
            ) : (
              <Link
                key={p.id}
                href={`${browsePath}?maxPrice=${p.max}#catalog`}
                className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
              >
                {t(p.labelKey)}
              </Link>
            ),
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {t('browse.discovery.popular')}
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'newest', labelKey: 'browse.sort.newest' },
              { id: 'price_asc', labelKey: 'browse.sort.priceAsc' },
            ] as const
          ).map((s) =>
            onSortPick ? (
              <button
                key={s.id}
                type="button"
                onClick={() => onSortPick(s.id)}
                className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
              >
                {t(s.labelKey)}
              </button>
            ) : (
              <Link
                key={s.id}
                href={`${browsePath}?sort=${s.id}#catalog`}
                className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
              >
                {t(s.labelKey)}
              </Link>
            ),
          )}
        </div>
      </div>

      {!compact ? (
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
      ) : null}

      {!compact ? (
        <p className="text-[11px] text-gray-400 leading-relaxed">{t('browse.discovery.tip')}</p>
      ) : null}
    </div>
  );
}
