'use client';

import Link from 'next/link';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';

export default function GuestLandingHeader() {
  return (
    <header className="landing-hero-header absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-5">
      <Link
        href="/"
        className="text-[1.15rem] font-bold tracking-tight text-white drop-shadow-sm"
        aria-label="ROBEO home"
      >
        ROBEO
      </Link>
      <LanguageSwitcher variant="dark" />
    </header>
  );
}
