'use client';

import { formatDateIso } from '@/lib/formatDateTime';
import { useClientMounted } from '@/hooks/useClientMounted';

type Props = {
  iso: string;
  locale?: string;
  className?: string;
};

/** Dátum megjelenítés mount után — hydration-safe. */
export default function ClientFormattedDate({
  iso,
  locale = 'hu-HU',
  className = '',
}: Props) {
  const mounted = useClientMounted();
  if (!mounted || !iso) {
    return (
      <span className={className} suppressHydrationWarning>
        —
      </span>
    );
  }
  return (
    <span className={className} suppressHydrationWarning>
      {formatDateIso(iso, locale)}
    </span>
  );
}
