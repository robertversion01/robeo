'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Heart, User, Plus, LogOut, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrowseSearch } from '@/context/BrowseContext';
import { FeedNavBadge, MessagesNavBadge } from '@/context/NotificationContext';
import CatalogSearchBar from '@/components/browse/CatalogSearchBar';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';
import type { CatalogFilterState } from '@/lib/catalogFilters';

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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const resolvedSearchQuery = searchQuery ?? browse.searchQuery;
  const isGuest = !loading && !user;
  const hideOnGuestHome = pathname === '/' && !user;
  const hideOnAuth = pathname === '/auth';

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

  const catalogFilters: CatalogFilterState = {
    category: 'all',
    brand: 'all',
    size: 'all',
    condition: 'all',
    minPrice: 0,
    maxPrice: 0,
    sort: 'newest',
    search: resolvedSearchQuery,
  };

  const searchField = (
    <CatalogSearchBar
      value={resolvedSearchQuery}
      onChange={onNavbarSearchChange}
      catalogFilters={catalogFilters}
      inputId="navbar-search"
      className="min-w-0 flex-1"
      onSeeAll={() => {
        if (pathname !== '/') {
          window.location.href = `/?q=${encodeURIComponent(resolvedSearchQuery.trim())}#catalog`;
        } else {
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    />
  );

  const desktopActions = loggedIn ? (
    <>
      <Link href="/upload" className="icon-btn text-gray-700" aria-label={t('nav.upload')}>
        <Plus size={18} />
      </Link>
      <Link
        href="/notifications"
        className="icon-btn text-gray-700 relative"
        aria-label={t('nav.notifications')}
      >
        <Bell size={18} />
        <FeedNavBadge />
      </Link>
      <Link href="/messages" className="icon-btn text-gray-700 relative" aria-label={t('nav.messages')}>
        <MessageCircle size={18} />
        <MessagesNavBadge />
      </Link>
      <Link href="/favorites" className="icon-btn text-gray-700" aria-label={t('nav.favorites')}>
        <Heart size={18} />
      </Link>
      <div ref={profileMenuRef} className="relative z-[10000]">
        <button
          type="button"
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="icon-btn text-[#007782]"
          aria-label={t('nav.profile')}
        >
          <User size={18} />
        </button>
        {showProfileMenu ? (
          <div className="absolute right-0 top-10 w-44 card-base shadow-md p-1 z-[9999]">
            <Link
              href="/profile"
              className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowProfileMenu(false)}
            >
              <User size={15} />
              {t('nav.myProfile')}
            </Link>
            <Link
              href="/notifications"
              className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowProfileMenu(false)}
            >
              <Bell size={15} />
              {t('nav.notifications')}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} />
              {t('nav.signOut')}
            </button>
          </div>
        ) : null}
      </div>
    </>
  ) : loading ? (
    <div className="w-20 h-9 animate-pulse bg-gray-100 rounded-full" />
  ) : (
    <>
      <LanguageSwitcher variant="light" className="hidden sm:inline-flex" />
      <Link
        href="/auth?view=sign_up"
        className="h-8 rounded-full bg-[#007782] px-2.5 text-xs font-semibold text-white inline-flex items-center"
      >
        {t('nav.register')}
      </Link>
      <Link
        href="/auth?view=sign_in"
        className="h-8 rounded-full border border-gray-300 px-2.5 text-xs font-semibold text-gray-700 inline-flex items-center"
      >
        {t('nav.login')}
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] h-11 bg-white border-b border-gray-200 shadow-sm">
      {showProfileMenu ? (
        <button
          type="button"
          aria-label={t('nav.profile')}
          onClick={() => setShowProfileMenu(false)}
          className="fixed inset-0 z-[9998] bg-black/20 cursor-default md:hidden"
        />
      ) : null}

      <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-2 sm:px-3">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-wide text-[#007782] hover:text-[#006670]"
        >
          ROBEO
        </Link>

        {searchField}

        {loggedIn ? (
          <LanguageSwitcher variant="light" className="hidden lg:inline-flex shrink-0" />
        ) : null}

        <div className={`hidden md:flex items-center gap-1 shrink-0 ${!loggedIn && isGuest ? 'ml-auto' : ''}`}>
          {desktopActions}
        </div>

        {isGuest ? (
          <div className="ml-auto flex md:hidden items-center gap-1 shrink-0">{desktopActions}</div>
        ) : (
          <div className="ml-auto flex md:hidden items-center gap-1 shrink-0">
            <LanguageSwitcher variant="light" className="shrink-0 scale-90" />
            {loggedIn ? (
              <>
                <Link href="/notifications" className="icon-btn text-gray-700 relative" aria-label={t('nav.notifications')}>
                  <Bell size={18} />
                  <FeedNavBadge />
                </Link>
                <Link href="/messages" className="icon-btn text-gray-700 relative" aria-label={t('nav.messages')}>
                  <MessageCircle size={18} />
                  <MessagesNavBadge />
                </Link>
              </>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}
