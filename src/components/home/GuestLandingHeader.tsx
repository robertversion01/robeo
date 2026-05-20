'use client';

import Link from 'next/link';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';

export default function GuestLandingHeader() {
  return (
    <header className="landing-hero-header absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-3 pt-[max(0.25rem,env(safe-area-inset-top))] sm:px-5">
      <Link
        href="/"
        className="text-[1.05rem] font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.15rem]"
        aria-label="ROBEO home"
      >
        ROBEO
      </Link>
      <LanguageSwitcher variant="dark" className="scale-[0.92] sm:scale-100" />
    </header>
  );
}
