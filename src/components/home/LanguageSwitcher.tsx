'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'hu', label: 'HU' },
  { code: 'en', label: 'EN' },
] as const;

type Props = {
  className?: string;
  variant?: 'dark' | 'light';
};

export default function LanguageSwitcher({ className, variant = 'dark' }: Props) {
  const { i18n } = useTranslation();
  const active = i18n.language?.startsWith('en') ? 'en' : 'hu';

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center rounded-full p-0.5 text-[11px] font-semibold tracking-wide',
        variant === 'dark'
          ? 'bg-white/10 ring-1 ring-white/20 backdrop-blur-sm'
          : 'bg-gray-100 ring-1 ring-gray-200',
        className,
      )}
    >
      {LANGUAGES.map(({ code, label }) => {
        const isActive = active === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => void i18n.changeLanguage(code)}
            className={cn(
              'min-w-[2rem] rounded-full px-2 py-1 transition-colors touch-manipulation',
              variant === 'dark'
                ? isActive
                  ? 'bg-white text-[#0f1a1d]'
                  : 'text-white/80 hover:text-white'
                : isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
            )}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
