'use client';

import { formatTimeIso } from '@/lib/formatDateTime';
import { useClientMounted } from '@/hooks/useClientMounted';

type Props = {
  iso: string;
  locale?: string;
  className?: string;
};

/** Idő megjelenítés mount után — elkerüli a hydration #418-et. */
export default function ClientFormattedTime({
  iso,
  locale = 'hu-HU',
  className = '',
}: Props) {
  const mounted = useClientMounted();
  if (!mounted || !iso) {
    return (
      <span className={className} suppressHydrationWarning>
        --:--
      </span>
    );
  }
  return (
    <span className={className} suppressHydrationWarning>
      {formatTimeIso(iso, locale)}
    </span>
  );
}
