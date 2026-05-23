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
  dark?: boolean;
};

/** Hacoo-szerű discovery chip — aktív állapot + opcionális darabszám. */
export default function DiscoveryChip({
  label,
  active = false,
  count,
  variant = 'default',
  href,
  onClick,
  dark = false,
}: Props) {
  const className = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all touch-manipulation',
    dark &&
      variant === 'default' &&
      (active
        ? 'border-white bg-white text-[#121212] shadow-sm'
        : 'border-white/20 bg-transparent text-gray-200 hover:border-white/35'),
    dark &&
      variant === 'pref' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/40 bg-[#007782]/10 text-[#5ec4cc] hover:border-[#007782]/60'),
    !dark &&
      variant === 'pref' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/30 bg-[#007782]/5 text-[#007782] hover:border-[#007782]/50'),
    !dark &&
      variant === 'price' &&
      (active
        ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
        : 'border-amber-200/90 bg-amber-50 text-amber-900 hover:border-amber-400'),
    !dark &&
      variant === 'accent' &&
      (active
        ? 'border-[#007782] bg-[#007782] text-white shadow-sm'
        : 'border-[#007782]/25 bg-[#007782]/5 text-[#007782] hover:border-[#007782]/45'),
    !dark &&
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
