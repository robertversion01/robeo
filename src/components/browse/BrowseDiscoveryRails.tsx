'use client';

import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PRICE_RAIL_CHIPS, type DiscoveryChipStat } from '@/lib/discoveryStats';
import { catalogUrlFromFilters } from '@/lib/catalogUrlParams';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import DiscoveryChip from '@/components/browse/DiscoveryChip';

const FALLBACK_BRANDS: DiscoveryChipStat[] = [
  { name: 'Nike', count: 0 },
  { name: 'Zara', count: 0 },
  { name: 'H&M', count: 0 },
  { name: 'Adidas', count: 0 },
  { name: "Levi's", count: 0 },
  { name: 'Mango', count: 0 },
];
const FALLBACK_SIZES: DiscoveryChipStat[] = [
  { name: 'XS', count: 0 },
  { name: 'S', count: 0 },
  { name: 'M', count: 0 },
  { name: 'L', count: 0 },
  { name: 'XL', count: 0 },
  { name: '38', count: 0 },
  { name: '40', count: 0 },
  { name: '42', count: 0 },
];
const CONDITION_CHIPS = [
  { id: 'new', labelKey: 'browse.discovery.conditionNew' },
  { id: 'like_new', labelKey: 'browse.discovery.conditionLikeNew' },
  { id: 'good', labelKey: 'browse.discovery.conditionGood' },
] as const;

type Props = {
  browsePath?: string;
  brandChips?: DiscoveryChipStat[];
  sizeChips?: DiscoveryChipStat[];
  prefBrands?: string[];
  compact?: boolean;
  /** Hacoo-szerű egykártyás desktop elrendezés */
  hacooCard?: boolean;
  activeFilters?: CatalogFilterState;
  maxPriceLimit?: number;
  allowFallback?: boolean;
  onBrandPick?: (brand: string) => void;
  onSizePick?: (size: string) => void;
  onConditionPick?: (condition: string) => void;
  onSortPick?: (sort: string) => void;
  onMaxPricePick?: (max: number) => void;
  className?: string;
  /** Csak a márka sor (mobil feed) */
  brandsOnly?: boolean;
  /** Sötét feed téma */
  dark?: boolean;
  /** Egyedi márka sor cím */
  brandRowTitleKey?: string;
};

function discoveryHref(
  browsePath: string,
  patch: Partial<CatalogFilterState>,
  maxPriceLimit = 0,
): string {
  const filters: CatalogFilterState = {
    category: 'all',
    subcategory: 'all',
    brand: 'all',
    size: 'all',
    condition: 'all',
    color: 'all',
    minPrice: 0,
    maxPrice: 0,
    sort: 'newest',
    search: '',
    ...patch,
  };
  return `${catalogUrlFromFilters(filters, maxPriceLimit, browsePath)}#catalog`;
}

function RailRow({
  title,
  accent,
  dark = false,
  children,
}: {
  title: string;
  accent?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={cn(
          'mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide',
          dark ? 'text-gray-400' : accent ? 'text-[#007782]' : 'text-gray-500',
        )}
      >
        {accent ? <Sparkles size={12} className="shrink-0" aria-hidden /> : null}
        {title}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">{children}</div>
    </div>
  );
}

export default function BrowseDiscoveryRails({
  browsePath = '/browse',
  brandChips,
  sizeChips,
  prefBrands = [],
  compact = false,
  hacooCard = false,
  activeFilters,
  maxPriceLimit = 0,
  allowFallback = true,
  onBrandPick,
  onSizePick,
  onConditionPick,
  onSortPick,
  onMaxPricePick,
  className,
  brandsOnly = false,
  dark = false,
  brandRowTitleKey,
}: Props) {
  const { t } = useTranslation();

  const prefBrandStats: DiscoveryChipStat[] = prefBrands.map((name) => ({ name, count: 0 }));

  const brandStats = [
    ...new Map(
      [...prefBrandStats, ...(brandChips?.length ? brandChips : allowFallback ? FALLBACK_BRANDS : [])].map(
        (b) => [b.name, b],
      ),
    ).values(),
  ].slice(0, 10);

  const sizeStats = (sizeChips?.length ? sizeChips : allowFallback ? FALLBACK_SIZES : []).slice(0, 10);

  const activeBrand = activeFilters?.brand ?? 'all';
  const activeSize = activeFilters?.size ?? 'all';
  const activeCondition = activeFilters?.condition ?? 'all';
  const activeSort = activeFilters?.sort ?? 'newest';
  const activeMin = activeFilters?.minPrice ?? 0;
  const activeMax = activeFilters?.maxPrice ?? 0;

  const isPriceActive = (max: number) =>
    activeMin === 0 && (max === 0 ? activeMax >= maxPriceLimit : activeMax === max);

  const hasBrandRow = brandStats.length > 0;
  const hasSizeRow = !compact && sizeStats.length > 0;
  const hasDiscoveryData = hasBrandRow || hasSizeRow || prefBrands.length > 0;

  const renderBrand = (stat: DiscoveryChipStat, variant: 'pref' | 'default' = 'default') => {
    const active = activeBrand === stat.name;
    const common = {
      label: stat.name,
      active,
      count: stat.count > 0 ? stat.count : undefined,
      variant,
      dark,
    } as const;
    if (onBrandPick) {
      return (
        <DiscoveryChip key={stat.name} {...common} onClick={() => onBrandPick(stat.name)} />
      );
    }
    return (
      <DiscoveryChip
        key={stat.name}
        {...common}
        href={discoveryHref(browsePath, { brand: stat.name }, maxPriceLimit)}
      />
    );
  };

  const renderSize = (stat: DiscoveryChipStat) => {
    const active = activeSize === stat.name;
    const common = {
      label: stat.name,
      active,
      count: stat.count > 0 ? stat.count : undefined,
      variant: 'default' as const,
    };
    if (onSizePick) {
      return <DiscoveryChip key={stat.name} {...common} onClick={() => onSizePick(stat.name)} />;
    }
    return (
      <DiscoveryChip
        key={stat.name}
        {...common}
        href={discoveryHref(browsePath, { size: stat.name }, maxPriceLimit)}
      />
    );
  };

  const priceRow = (
    <RailRow title={t('browse.discovery.price')}>
      {PRICE_RAIL_CHIPS.map((p) => {
        const active = isPriceActive(p.max);
        const label = t(p.labelKey);
        if (onMaxPricePick) {
          return (
            <DiscoveryChip
              key={p.id}
              label={label}
              active={active}
              variant="price"
              onClick={() => onMaxPricePick(p.max)}
            />
          );
        }
        return (
          <DiscoveryChip
            key={p.id}
            label={label}
            active={active}
            variant="price"
            href={discoveryHref(browsePath, { maxPrice: p.max }, maxPriceLimit)}
          />
        );
      })}
    </RailRow>
  );

  const sortRow = (
    <RailRow title={t('browse.discovery.popular')}>
      {(
        [
          { id: 'newest', labelKey: 'browse.sort.newest' },
          { id: 'price_asc', labelKey: 'browse.sort.priceAsc' },
        ] as const
      ).map((s) => {
        const active = activeSort === s.id;
        const label = t(s.labelKey);
        if (onSortPick) {
          return (
            <DiscoveryChip
              key={s.id}
              label={label}
              active={active}
              variant="price"
              onClick={() => onSortPick(s.id)}
            />
          );
        }
        return (
          <DiscoveryChip
            key={s.id}
            label={label}
            active={active}
            variant="price"
            href={discoveryHref(browsePath, { sort: s.id }, maxPriceLimit)}
          />
        );
      })}
    </RailRow>
  );

  const conditionRow = !compact ? (
    <RailRow title={t('browse.discovery.condition')}>
      {CONDITION_CHIPS.map((c) => {
        const active = activeCondition === c.id;
        const label = t(c.labelKey);
        if (onConditionPick) {
          return (
            <DiscoveryChip
              key={c.id}
              label={label}
              active={active}
              variant="accent"
              onClick={() => onConditionPick(c.id)}
            />
          );
        }
        return (
          <DiscoveryChip
            key={c.id}
            label={label}
            active={active}
            variant="accent"
            href={discoveryHref(browsePath, { condition: c.id }, maxPriceLimit)}
          />
        );
      })}
    </RailRow>
  ) : null;

  if (brandsOnly) {
    if (!hasBrandRow) return null;
    return (
      <div className={cn('mb-2', className)}>
        <RailRow
          title={t(brandRowTitleKey ?? 'browse.discovery.shopByBrand')}
          dark={dark}
        >
          {brandStats.map((stat) =>
            renderBrand(stat, prefBrands.includes(stat.name) ? 'pref' : 'default'),
          )}
        </RailRow>
      </div>
    );
  }

  if (!hasDiscoveryData && !compact) {
    return <div className={cn('mb-3', className)}>{priceRow}</div>;
  }

  if (!hasDiscoveryData && compact) {
    return null;
  }

  const inner = (
    <>
      {prefBrands.length > 0 ? (
        <RailRow title={t('browse.discovery.forYou')} accent>
          {prefBrands.map((brand) => renderBrand({ name: brand, count: 0 }, 'pref'))}
        </RailRow>
      ) : null}

      {hasBrandRow ? (
        <RailRow title={t(hacooCard ? 'browse.discovery.trending' : 'browse.discovery.brands')} accent={hacooCard}>
          {brandStats.map((stat) =>
            renderBrand(stat, prefBrands.includes(stat.name) ? 'pref' : 'default'),
          )}
        </RailRow>
      ) : null}

      {hasSizeRow ? (
        <RailRow title={t('browse.discovery.sizes')}>{sizeStats.map(renderSize)}</RailRow>
      ) : null}

      {priceRow}
      {sortRow}
      {conditionRow}

      {!compact ? (
        <p className="text-[11px] text-gray-400 leading-relaxed">{t('browse.discovery.tip')}</p>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        compact ? 'mb-2' : 'mb-3',
        hacooCard &&
          'rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white via-[#007782]/[0.03] to-amber-50/40 p-3.5 shadow-sm',
        !hacooCard && 'space-y-2.5',
        hacooCard && 'space-y-3',
        className,
      )}
    >
      {hacooCard ? (
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <Sparkles size={16} className="text-[#007782]" aria-hidden />
          <p className="text-sm font-bold text-gray-900">{t('browse.discovery.explore')}</p>
        </div>
      ) : null}
      {inner}
    </div>
  );
}
