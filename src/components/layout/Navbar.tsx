'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, Plus, LogOut, Bell, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrowseSearch } from '@/context/BrowseContext';
import { FeedNavBadge, MessagesNavBadge } from '@/context/NotificationContext';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';
import type { CatalogFilterState } from '@/lib/catalogFilters';
import { CATALOG_FILTER_DEFAULTS } from '@/lib/catalogUrlParams';
import { cn } from '@/lib/utils';
import { useImmersiveBrowse } from '@/context/ImmersiveBrowseContext';
import {
  isBrowseSearchPath,
  shouldHideNavbarOnMobileTabPages,
  shouldShowHeaderProfileMenu,
  shouldShowMobileHeaderQuickActions,
  shouldShowMobileBottomNav,
} from '@/lib/navVisibility';
import { ROBEO_BP_MODE } from '@/lib/features';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const { t } = useTranslation();
  const browse = useBrowseSearch();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { shellChromeHidden } = useImmersiveBrowse();
  const resolvedSearchQuery = searchQuery ?? browse.searchQuery;
  const isGuest = !loading && !user;
  const hideOnGuestHome = pathname === '/' && !user;
  const hideOnAuth = pathname === '/auth';
  const browsePath = isBrowseSearchPath(pathname);
  const showHeaderProfile = shouldShowHeaderProfileMenu(pathname, Boolean(user));

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user: authUser } }) => {
        setUser(authUser);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Navbar auth init error:', error);
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;
      if (profileMenuRef.current?.contains(targetNode)) return;
      setShowProfileMenu(false);
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, []);

  const onNavbarSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else browse.setSearchQuery(value);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (hideOnGuestHome || hideOnAuth) return null;

  const loggedIn = Boolean(user);
  const hideNavbarOnMobileTabs = shouldHideNavbarOnMobileTabPages(pathname, loggedIn);
  const mobileMinimalHeader =
    loggedIn &&
    shouldShowMobileBottomNav(pathname, loggedIn) &&
    !shouldShowMobileHeaderQuickActions(pathname, loggedIn);

  const catalogFilters: CatalogFilterState = {
    ...CATALOG_FILTER_DEFAULTS,
    search: resolvedSearchQuery,
  };

  const catalogBrowsePath = pathname === '/' ? '/' : '/browse';

  const searchField = (
    <CatalogSearchBar
      value={resolvedSearchQuery}
      onChange={onNavbarSearchChange}
      catalogFilters={catalogFilters}
      inputId="navbar-search"
      className="min-w-0 flex-1 w-full max-w-none"
      browsePath={catalogBrowsePath}
      onSeeAll={() => {
        const q = encodeURIComponent(resolvedSearchQuery.trim());
        const href = q ? `${catalogBrowsePath}?q=${q}#catalog` : `${catalogBrowsePath}#catalog`;
        if (pathname !== catalogBrowsePath) {
          router.push(href);
        } else {
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    />
  );

  const profileMenu = loggedIn ? (
    <div
      ref={profileMenuRef}
      className={cn('relative z-[10000] shrink-0', !showHeaderProfile && 'hidden md:block')}
    >
      <button
        type="button"
        onClick={() => setShowProfileMenu((prev) => !prev)}
        className="icon-btn text-[#007782]"
        aria-label={t('nav.profile')}
        aria-expanded={showProfileMenu}
      >
        <User size={18} />
      </button>
      {showProfileMenu ? (
        <div className="absolute right-0 top-10 w-48 card-base shadow-md p-1 z-[9999]">
          <div className="px-2 py-2 border-b border-gray-100">
            <LanguageSwitcher variant="light" className="w-full justify-center" />
          </div>
          {/* RobeoBP: nincs rendeles-nyomonkovetes oldal, a foglalasok a
              chatben jelennek meg. V1-ben tovabbra is megjelenik. */}
          {!ROBEO_BP_MODE ? (
            <Link
              href="/orders"
              className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowProfileMenu(false)}
            >
              <Package size={15} />
              {t('nav.orders')}
            </Link>
          ) : null}
          <Link
            href="/profile"
            className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setShowProfileMenu(false)}
          >
            <User size={15} />
            {t('nav.myProfile')}
          </Link>
          <Link
            href="/help"
            className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setShowProfileMenu(false)}
          >
            {t('help.title')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(false);
              void handleSignOut();
            }}
            className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={15} />
            {t('nav.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  const notificationsLink = loggedIn ? (
    <Link
      href="/notifications"
      className="icon-btn text-gray-700 relative shrink-0"
      aria-label={t('nav.notifications')}
    >
      <Bell size={18} />
      <FeedNavBadge />
    </Link>
  ) : null;

  const messagesLink = loggedIn ? (
    <Link
      href="/messages"
      className="icon-btn text-gray-700 relative shrink-0"
      aria-label={t('nav.messages')}
    >
      <MessageCircle size={18} />
      <MessagesNavBadge />
    </Link>
  ) : null;

  const guestDesktopActions = loading ? (
    <div className="w-20 h-9 animate-pulse bg-gray-100 rounded-full" />
  ) : (
    <>
      <LanguageSwitcher variant="light" className="shrink-0" />
      <Link
        href="/auth?view=sign_up"
        className="h-8 rounded-full bg-[#007782] px-2.5 text-xs font-semibold text-white inline-flex items-center shrink-0"
      >
        {t('nav.register')}
      </Link>
      <Link
        href="/auth?view=sign_in"
        className="h-8 rounded-full border border-gray-300 px-2.5 text-xs font-semibold text-gray-700 inline-flex items-center shrink-0"
      >
        {t('nav.login')}
      </Link>
    </>
  );

  const loggedInDesktopActions = (
    <>
      <Link href="/upload" className="icon-btn text-gray-700 shrink-0" aria-label={t('nav.upload')}>
        <Plus size={18} />
      </Link>
      {notificationsLink}
      {messagesLink}
      {/* RobeoBP: a top-nav ikon /orders shortcut is rejtve. */}
      {!ROBEO_BP_MODE ? (
        <Link href="/orders" className="icon-btn text-gray-700 shrink-0" aria-label={t('nav.orders')} title={t('nav.orders')}>
          <Package size={18} />
        </Link>
      ) : null}
      <Link href="/favorites" className="icon-btn text-gray-700 shrink-0" aria-label={t('nav.favorites')}>
        <Heart size={18} />
      </Link>
      {profileMenu}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="icon-btn text-gray-600 hover:text-red-600 shrink-0"
        aria-label={t('nav.signOut')}
        title={t('nav.signOut')}
      >
        <LogOut size={18} />
      </button>
    </>
  );

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] bg-white border-b border-gray-200 transition-transform duration-300 ease-out will-change-transform',
        'pt-[env(safe-area-inset-top,0px)]',
        browsePath && loggedIn ? 'border-gray-100' : 'shadow-sm',
        hideNavbarOnMobileTabs && 'max-md:hidden',
        shellChromeHidden && 'max-md:-translate-y-full max-md:pointer-events-none',
      )}
    >
      {showProfileMenu ? (
        <button
          type="button"
          aria-label={t('nav.profile')}
          onClick={() => setShowProfileMenu(false)}
          className="fixed inset-0 z-[9998] bg-black/20 cursor-default md:hidden"
        />
      ) : null}

      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center gap-1.5 px-3 sm:gap-2 sm:px-3',
          browsePath && loggedIn ? 'h-10' : 'h-11',
        )}
      >
        {!(browsePath && loggedIn) ? (
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-wide text-[#007782] hover:text-[#006670]"
          >
            ROBEO
          </Link>
        ) : (
          <Link
            href="/"
            className="shrink-0 text-xs font-semibold text-gray-400 hover:text-[#007782] md:text-sm md:text-[#007782]"
            aria-label="ROBEO"
          >
            ← {t('nav.home')}
          </Link>
        )}

        {loggedIn && !browsePath ? (
          <div className="hidden md:block min-w-0 flex-1">{searchField}</div>
        ) : null}

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {loggedIn ? (
            <>
              <div className="hidden md:contents">{loggedInDesktopActions}</div>
              {!mobileMinimalHeader ? (
                <div className="flex md:hidden items-center gap-0.5">
                  {notificationsLink}
                  {messagesLink}
                  {profileMenu}
                </div>
              ) : null}
            </>
          ) : (
            guestDesktopActions
          )}
        </div>

      </div>
    </nav>
  );
}
