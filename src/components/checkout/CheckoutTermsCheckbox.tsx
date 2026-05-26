'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/** Kötelező ÁSZF + adatvédelem elfogadás a fizetés előtt (Vinted-paritás). */
export default function CheckoutTermsCheckbox({ checked, onChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left',
        checked && 'border-[#007782]/30 bg-[#007782]/5',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#007782]"
        aria-describedby="checkout-terms-desc"
      />
      <span id="checkout-terms-desc" className="text-xs leading-relaxed text-gray-700">
        {t('checkout.terms.prefix')}{' '}
        <Link
          href="/legal/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#007782] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {t('checkout.terms.termsLink')}
        </Link>{' '}
        {t('checkout.terms.and')}{' '}
        <Link
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#007782] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {t('checkout.terms.privacyLink')}
        </Link>
        {t('checkout.terms.payJoin')}{' '}
        <Link
          href="/legal/pay"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#007782] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {t('checkout.terms.payLink')}
        </Link>
        .
      </span>
    </label>
  );
}
