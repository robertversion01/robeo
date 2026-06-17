'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BUDAPEST_DISTRICTS } from '@/lib/budapestDistricts';

type Props = {
  selectedDistrict?: string;
  counts?: Record<string, number>;
  loadingCounts?: boolean;
  onDistrictPick?: (districtId: string) => void;
  districtHref?: (districtId: string) => string;
  allLabel: string;
  className?: string;
};

function DistrictCell({
  active,
  title,
  onClick,
  href,
  children,
}: {
  active: boolean;
  title: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className = cn(
    'relative flex h-9 min-w-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-colors touch-manipulation',
    active
      ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
      : 'border-[#007782]/20 bg-white text-[#007782] hover:border-[#007782]/45 hover:bg-[#007782]/8',
  );

  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" title={title} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** RobeoBP — kompakt 6×4 kerület-rács (jobb helykihasználás, mint 23 wrap chip). */
export default function BudapestDistrictGrid({
  selectedDistrict = 'all',
  counts = {},
  loadingCounts = false,
  onDistrictPick,
  districtHref,
  allLabel,
  className,
}: Props) {
  const showAllActive = !selectedDistrict || selectedDistrict === 'all';

  return (
    <div className={cn('space-y-2', className)}>
      {onDistrictPick ? (
        <button
          type="button"
          onClick={() => onDistrictPick('all')}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors touch-manipulation',
            showAllActive
              ? 'border-[#007782] bg-[#007782] text-white'
              : 'border-[#007782]/25 bg-white text-[#007782] hover:bg-[#007782]/8',
          )}
        >
          {allLabel}
        </button>
      ) : districtHref ? (
        <Link
          href={districtHref('all')}
          className={cn(
            'block w-full rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors',
            showAllActive
              ? 'border-[#007782] bg-[#007782] text-white'
              : 'border-[#007782]/25 bg-white text-[#007782] hover:bg-[#007782]/8',
          )}
        >
          {allLabel}
        </Link>
      ) : null}

      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 sm:gap-1.5">
        {BUDAPEST_DISTRICTS.map((d) => {
          const active = selectedDistrict === d.id;
          const count = counts[d.id];
          const inner = (
            <>
              <span className="leading-none">{d.id}</span>
              {!loadingCounts && typeof count === 'number' && count > 0 ? (
                <span
                  className={cn(
                    'absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full px-0.5 text-[9px] font-bold leading-tight',
                    active ? 'bg-white text-[#007782]' : 'bg-[#007782]/15 text-[#007782]',
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </>
          );

          return (
            <DistrictCell
              key={d.id}
              active={active}
              title={d.label}
              href={districtHref && !onDistrictPick ? districtHref(d.id) : undefined}
              onClick={onDistrictPick ? () => onDistrictPick(d.id) : undefined}
            >
              {inner}
            </DistrictCell>
          );
        })}
      </div>
    </div>
  );
}
