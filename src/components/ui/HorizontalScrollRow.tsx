'use client';

import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Negatív oldalsó margó + padding — teljes szélességű swipe mobilon */
  bleed?: boolean;
  /** Oldalsó bleed méret (px-2 oldal paddingű oldalakhoz: 2) */
  bleedInset?: 2 | 3;
  'aria-label'?: string;
  role?: string;
};

const BLEED_CLASS: Record<2 | 3, string> = {
  2: '-mx-2 px-2',
  3: '-mx-3 px-3',
};

/** Horizontálisan lapozható sor — ne használj benne touch-manipulation gombot. */
export default function HorizontalScrollRow({
  children,
  className,
  innerClassName,
  bleed = true,
  bleedInset = 3,
  'aria-label': ariaLabel,
  role,
}: Props) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn(
        'overflow-x-auto overscroll-x-contain no-scrollbar',
        '[-webkit-overflow-scrolling:touch] [touch-action:pan-x] [scrollbar-width:none]',
        bleed && BLEED_CLASS[bleedInset],
        className,
      )}
    >
      <div className={cn('flex min-w-max items-center gap-4 pr-4', innerClassName)}>{children}</div>
    </div>
  );
}
