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
        ? 'border-amber-600 bg-amber-700 text-white shadow-sm'
        : 'border-amber-900/45 bg-amber-950/40 text-amber-200 hover:border-amber-600/60'),
    variant === 'accent' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/25 bg-[#17343a]/60 text-[#38c7d0] hover:border-[#007782]/45'),
    variant === 'default' &&
      (active
        ? 'border-[#38c7d0] bg-[#17343a] text-[#9be2e8] shadow-sm'
        : 'border-[#2a3941] bg-[#1a2328] text-[#b2c0c6] hover:border-[#38c7d0]/40 hover:text-[#9be2e8]'),
  );

  const content = (
    <>
      <span>{label}</span>
      {count != null && count > 0 ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-[#e7edf0]/20 text-inherit' : 'bg-[#1a2328] text-[#8fa3ad]',
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
