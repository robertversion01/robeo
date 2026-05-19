'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Heart, User, Search, Plus, LogOut } from 'lucide-react';
import { useBrowseSearch } from '@/context/BrowseContext';
import { MessagesNavBadge } from '@/context/NotificationContext';
import type { Product } from '@/types';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const browse = useBrowseSearch();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [liveResults, setLiveResults] = useState<
    Array<Pick<Product, 'id' | 'name' | 'category' | 'brand'>>
  >([]);
  const [showLiveResults, setShowLiveResults] = useState(false);
  const pathname = usePathname();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
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
      if (searchContainerRef.current?.contains(targetNode)) return;
      setShowProfileMenu(false);
      setShowLiveResults(false);
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    const query = resolvedSearchQuery.trim();
    if (query.length < 2) {
      setLiveResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, brand')
        .or(`name.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(8);

      if (!error) {
        setLiveResults((data || []) as Array<Pick<Product, 'id' | 'name' | 'category' | 'brand'>>);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [resolvedSearchQuery]);

  const onNavbarSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else browse.setSearchQuery(value);
    setShowLiveResults(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (hideOnGuestHome || hideOnAuth) return null;

  const loggedIn = Boolean(user);

  const searchField = (
    <div ref={searchContainerRef} className="relative z-[10000] min-w-0 flex-1 pointer-events-auto">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
      <input
        id="search-input"
        name="search"
        type="text"
        placeholder="Keress márkákra, ruhákra..."
        value={resolvedSearchQuery}
        onFocus={() => setShowLiveResults(true)}
        onChange={(e) => onNavbarSearchChange(e.target.value)}
        className="w-full h-9 pl-8 pr-3 bg-gray-100 rounded-full text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#007782]"
      />
      {showLiveResults && resolvedSearchQuery.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-10 z-[9999] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {liveResults.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-gray-500">Nincs találat.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {liveResults.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => setShowLiveResults(false)}
                  className="block px-3 py-2.5 hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[item.brand, item.category].filter(Boolean).join(' · ') || item.category}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const desktopActions = loggedIn ? (
    <>
      <Link href="/upload" className="icon-btn text-gray-700" aria-label="Feltöltés">
        <Plus size={18} />
      </Link>
      <Link href="/messages" className="icon-btn text-gray-700 relative" aria-label="Üzenetek">
        <MessageCircle size={18} />
        <MessagesNavBadge />
      </Link>
      <Link href="/favorites" className="icon-btn text-gray-700" aria-label="Kedvencek">
        <Heart size={18} />
      </Link>
      <div ref={profileMenuRef} className="relative z-[10000]">
        <button
          type="button"
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="icon-btn text-[#007782]"
          aria-label="Profil menü"
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
              Profilom
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full min-h-9 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} />
              Kijelentkezés
            </button>
          </div>
        ) : null}
      </div>
    </>
  ) : loading ? (
    <div className="w-20 h-9 animate-pulse bg-gray-100 rounded-full" />
  ) : (
    <>
      <Link
        href="/auth?view=sign_up"
        className="h-8 rounded-full bg-[#007782] px-2.5 text-xs font-semibold text-white inline-flex items-center"
      >
        Regisztráció
      </Link>
      <Link
        href="/auth?view=sign_in"
        className="h-8 rounded-full border border-gray-300 px-2.5 text-xs font-semibold text-gray-700 inline-flex items-center"
      >
        Belépés
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] h-11 bg-white border-b border-gray-200 shadow-sm">
      {showProfileMenu ? (
        <button
          type="button"
          aria-label="Profil menü bezárása"
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

        {loggedIn || !isGuest ? searchField : null}

        <div className={`hidden md:flex items-center gap-1 shrink-0 ${!loggedIn && isGuest ? 'ml-auto' : ''}`}>
          {desktopActions}
        </div>

        {isGuest ? (
          <div className="ml-auto flex md:hidden items-center gap-1 shrink-0">{desktopActions}</div>
        ) : null}
      </div>
    </nav>
  );
}
