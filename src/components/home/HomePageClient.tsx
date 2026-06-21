'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import VintedHero from '@/components/home/VintedHero';
import CatalogBrowsePanel from '@/components/browse/CatalogBrowsePanel';
import { DESKTOP_TOP_PADDING } from '@/lib/layoutTokens';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import CookieConsentBanner from '@/components/legal/CookieConsentBanner';
import { cn } from '@/lib/utils';

function useIsDesktopLayout() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

function HomePageContent() {
  const { t } = useTranslation();
  const { allProducts, user } = useProducts();
  const isGuest = !user;
  const isDesktopLayout = useIsDesktopLayout();
  const heroProducts = useMemo(
    () => filterProductsWithValidImages(allProducts),
    [allProducts],
  );

  const guestFeedPanel = (
    <CatalogBrowsePanel
      browsePath="/"
      stickyTopClass="top-0"
      showPersonalization={false}
      variant="feed"
    />
  );

  if (isGuest) {
    return (
      <div className="landing-page-root min-h-screen max-w-[100vw] overflow-x-clip bg-[#11171a] text-[#e7edf0]">
        <CookieConsentBanner />
        <main className="w-full max-w-[100vw] overflow-x-clip">
          {isDesktopLayout ? (
            <>
              <VintedHero products={heroProducts} fullScreen />
              <div className="landing-catalog mx-auto max-w-7xl px-2 pt-3 pb-5 md:px-4 md:pt-3 md:pb-6">
                <h2 className="mb-2 text-sm font-semibold text-[#e7edf0] md:text-base">
                  {t('landing.catalog.title')}
                </h2>
                {guestFeedPanel}
              </div>
            </>
          ) : (
            /* Mobil: search-first — egyetlen feed mount (nincs dupla ProductGrid key) */
            <div className="px-1 pt-1">{guestFeedPanel}</div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="landing-page-root min-h-screen max-w-[100vw] overflow-x-clip bg-[#11171a] text-[#e7edf0]">
      <CookieConsentBanner />
      <main
        className={cn(
          'w-full max-w-[100vw] overflow-x-clip',
          isDesktopLayout ? `px-2 pb-0 md:px-4 ${DESKTOP_TOP_PADDING}` : 'px-1 pt-1 pb-0',
        )}
      >
        <div className={isDesktopLayout ? 'mx-auto max-w-7xl' : undefined}>
          {isDesktopLayout ? (
            <VintedHero products={heroProducts} compact />
          ) : null}
          <CatalogBrowsePanel
            browsePath="/"
            stickyTopClass="top-0"
            showPersonalization
            variant="feed"
          />
        </div>
      </main>
    </div>
  );
}

export default function HomePageClient() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
