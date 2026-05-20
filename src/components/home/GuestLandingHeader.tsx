'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';

export default function GuestLandingHeader() {
  const { t } = useTranslation();

  const scrollToSearch = () => {
    const catalog = document.getElementById('catalog');
    catalog?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      document.getElementById('catalog-search')?.focus();
    }, 400);
  };

  return (
    <header className="landing-hero-header absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-3 pt-[max(0.25rem,env(safe-area-inset-top))] sm:px-5">
      <Link
        href="/"
        className="text-[1.05rem] font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.15rem]"
        aria-label="ROBEO home"
      >
        ROBEO
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={scrollToSearch}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/20 touch-manipulation"
          aria-label={t('browse.search.scrollToCatalog')}
        >
          <Search size={16} />
        </button>
        <LanguageSwitcher variant="dark" className="scale-[0.92] sm:scale-100" />
      </div>
    </header>
  );
}
