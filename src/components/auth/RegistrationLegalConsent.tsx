'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

/** Vinted-web: inline, aláhúzott linkek a mondatban (ÁSZF + adatvédelem + 18+). */
export default function RegistrationLegalConsent({ checked, onChange, id = 'registration-legal' }: Props) {
  const { t } = useTranslation();

  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#007782]"
        required
      />
      <span className="text-sm leading-relaxed text-gray-800">
        {t('auth.complete.legalPrefix')}{' '}
        <Link
          href="/legal/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007782] underline underline-offset-2 hover:text-[#005a63]"
          onClick={(e) => e.stopPropagation()}
        >
          {t('auth.acceptLegalTerms')}
        </Link>
        {t('auth.complete.legalMiddle')}{' '}
        <Link
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007782] underline underline-offset-2 hover:text-[#005a63]"
          onClick={(e) => e.stopPropagation()}
        >
          {t('auth.acceptLegalPrivacy')}
        </Link>{' '}
        {t('auth.complete.legalSuffix')}
      </span>
    </label>
  );
}
