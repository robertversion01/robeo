'use client';

import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '@/hooks/useProducts';
import VintedHero from '@/components/home/VintedHero';
import CatalogBrowsePanel from '@/components/browse/CatalogBrowsePanel';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { filterProductsWithValidImages } from '@/lib/productImageValidation';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import { cn } from '@/lib/utils';
import CookieConsentBanner from '@/components/legal/CookieConsentBanner';

function HomePageContent() {
  const { t } = useTranslation();
  const { allProducts, user } = useProducts();
  const isGuest = !user;
  const { catalogChromeHidden } = useImmersiveBrowse();
  const heroProducts = useMemo(
    () => filterProductsWithValidImages(allProducts),
    [allProducts],
  );

  if (isGuest) {
    return (
      <div className="landing-page-root min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
        <CookieConsentBanner />
        <main className="w-full max-w-[100vw] overflow-x-hidden">
          <VintedHero products={heroProducts} fullScreen />
          <div className="landing-catalog mx-auto max-w-7xl px-2 pt-3 pb-6 md:px-6 md:pt-4 md:pb-8">
            <h2 className="mb-2 text-base font-semibold text-gray-900 md:text-lg">
              {t('landing.catalog.title')}
            </h2>
            <CatalogBrowsePanel
              browsePath="/"
              stickyTopClass="top-0"
              showPersonalization={false}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-page-root min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-gray-900">
      <CookieConsentBanner />
      <main className={`w-full max-w-[100vw] overflow-x-hidden ${MAIN_TOP_PADDING} px-3 pb-2 md:px-6`}>
        <div className="mx-auto max-w-7xl">
          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
              catalogChromeHidden
                ? 'max-h-0 opacity-0 pointer-events-none'
                : 'max-h-[240px] opacity-100',
            )}
          >
            <VintedHero products={heroProducts} compact />
          </div>
          <CatalogBrowsePanel
            browsePath="/"
            stickyTopClass="top-11"
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
