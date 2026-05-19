'use client';

import Link from 'next/link';
import type { IncomingSaleAlert } from '@/lib/saleNotifications';
import { isUuid } from '@/lib/validators';

type Props = {
  alert: IncomingSaleAlert;
};

export default function SaleToastContent({ alert }: Props) {
  const productHref =
    alert.productId && isUuid(alert.productId) ? `/products/${alert.productId}` : null;
  const messagesHref = alert.buyerId
    ? `/messages?with=${encodeURIComponent(alert.buyerId)}`
    : '/messages';
  const profileHref = '/profile?tab=selling';

  return (
    <span className="text-sm text-gray-700 leading-snug block space-y-1">
      <span className="block">
        Becsomagolandó:{' '}
        {productHref ? (
          <Link href={productHref} className="font-semibold text-[#007782] underline underline-offset-2">
            {alert.productName}
          </Link>
        ) : (
          <strong>{alert.productName}</strong>
        )}
      </span>
      <span className="block">
        <Link href={messagesHref} className="font-semibold text-[#007782] underline underline-offset-2">
          Foxpost címke letöltése az üzenetekben →
        </Link>
      </span>
      <span className="block">
        Utána{' '}
        <Link href={profileHref} className="font-semibold text-[#007782] underline underline-offset-2">
          jelöld „Csomag feladva”-ként a profilodon
        </Link>
        {' '}
        vagy ugyanebben a chatben.
      </span>
    </span>
  );
}
