'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  active?: boolean;
  count?: number;
  variant?: 'default' | 'accent' | 'price' | 'pref';
  href?: string;
  onClick?: () => void;
};

/** Hacoo-szerű discovery chip — aktív állapot + opcionális darabszám. */
export default function DiscoveryChip({
  label,
  active = false,
  count,
  variant = 'default',
  href,
  onClick,
}: Props) {
  const className = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all touch-manipulation',
    variant === 'pref' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/30 bg-[#007782]/5 text-[#007782] hover:border-[#007782]/50'),
    variant === 'price' &&
      (active
        ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
        : 'border-amber-200/90 bg-amber-50 text-amber-900 hover:border-amber-400'),
    variant === 'accent' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/25 bg-[#007782]/5 text-[#007782] hover:border-[#007782]/45'),
    variant === 'default' &&
      (active
        ? 'border-gray-800 bg-gray-900 text-white shadow-sm'
        : 'border-gray-200 bg-white text-gray-700 hover:border-[#007782]/40 hover:text-[#007782]'),
  );

  const content = (
    <>
      <span>{label}</span>
      {count != null && count > 0 ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-white/20 text-inherit' : 'bg-gray-100 text-gray-500',
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
