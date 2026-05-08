'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, Search, Plus, LogOut } from 'lucide-react';
import type { Product } from '@/types';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<Array<Pick<Product, 'id' | 'name' | 'category'>>>([]);
  const [showLiveResults, setShowLiveResults] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const resolvedSearchQuery = searchQuery ?? localSearchQuery;
  const isGuest = !loading && !user;
  const hideOnGuestHome = pathname === '/' && !user;
  const hideOnAuth = pathname === '/auth';

  useEffect(() => {
    const checkUnreadMessages = async (currentUserId: string) => {
      const lastSeen = localStorage.getItem(`messages_last_seen_at_${currentUserId}`) || '1970-01-01T00:00:00.000Z';
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', currentUserId)
        .gt('created_at', lastSeen)
        .limit(1);

      if (!error) {
        setHasUnreadMessages((data || []).length > 0);
      }
    };

    // Check current session
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        setUser(user);
        setLoading(false);
        if (user?.id) {
          checkUnreadMessages(user.id);
        }
      })
      .catch((error) => {
        console.error('Navbar auth init error:', error);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user?.id) {
        checkUnreadMessages(session.user.id);
      } else {
        setHasUnreadMessages(false);
      }
    });

    const channel = supabase.channel('navbar-unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser?.id && payload?.new?.receiver_id === currentUser.id) {
            setHasUnreadMessages(true);
          }
        }
      )
      .subscribe();

    const handleSeen = () => {
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        if (currentUser?.id) checkUnreadMessages(currentUser.id);
      });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;
      if (profileMenuRef.current?.contains(targetNode)) return;
      if (searchContainerRef.current?.contains(targetNode)) return;
      setShowProfileMenu(false);
      setShowLiveResults(false);
    };
    window.addEventListener('messages:seen', handleSeen as EventListener);
    window.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener('messages:seen', handleSeen as EventListener);
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
        .select('id, name, category')
        .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(8);

      if (!error) {
        setLiveResults((data || []) as Array<Pick<Product, 'id' | 'name' | 'category'>>);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [resolvedSearchQuery]);

  const onNavbarSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearchQuery(value);
    }
    setShowLiveResults(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (hideOnGuestHome || hideOnAuth) {
    return null;
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] h-11 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 bg-white border-b border-gray-200 shadow-sm overflow-x-hidden w-full max-w-full ${isGuest ? 'justify-end' : 'justify-between'}`}>
      {!isGuest ? (
        <>
          <Link href="/" className="text-sm font-semibold tracking-wide hover:text-[#007782] transition-colors flex-shrink-0 text-[#007782]">
            ROBEO
          </Link>

          <div className={`flex-1 min-w-0 basis-0 w-full shrink ${user ? 'max-w-md' : 'max-w-[36vw] sm:max-w-sm'}`}>
            <div ref={searchContainerRef} className="relative z-[120]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Keress márkákra, ruhákra..."
                value={resolvedSearchQuery}
                onFocus={() => setShowLiveResults(true)}
                onChange={(e) => onNavbarSearchChange(e.target.value)}
                className="w-full min-w-0 shrink h-9 pl-8 pr-3 bg-gray-100 rounded-full text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#007782]"
              />

              {showLiveResults && resolvedSearchQuery.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-10 z-[130] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
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
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {loading ? (
            <div className="w-20 h-9 animate-pulse bg-gray-100 rounded-full"></div>
        ) : user ? (
          <>
            <Link href="/upload" className="icon-btn text-gray-700">
              <Plus size={16} className="text-gray-700" />
            </Link>
            <Link href="/messages" className="icon-btn text-gray-700 relative">
              <MessageCircle size={16} className="text-gray-700" />
              {hasUnreadMessages ? (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
              ) : null}
            </Link>
            <Link href="/favorites" className="icon-btn text-gray-700">
              <Heart size={16} className="text-gray-700" />
            </Link>
            <div ref={profileMenuRef} className="relative z-[130]">
              <button
                type="button"
                onClick={(e) => {
                  setShowProfileMenu((prev) => !prev);
                }}
                className="icon-btn text-[#007782] cursor-pointer pointer-events-auto"
                aria-label="Profil menü"
              >
                <User size={16} className="text-[#007782] pointer-events-auto" />
              </button>
              {showProfileMenu ? (
                <div
                  className="absolute right-0 top-10 w-44 card-base shadow-md p-1 z-[130]"
                >
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
        ) : (
          <>
            <Link href="/auth?view=sign_up" className="h-8 rounded-full bg-[#007782] px-2 text-[11px] sm:px-2.5 sm:text-xs font-semibold text-white inline-flex items-center justify-center whitespace-nowrap shrink-0">
              <span className="sm:hidden">Reg.</span>
              <span className="hidden sm:inline">Regisztráció</span>
            </Link>
            <Link href="/auth?view=sign_in" className="h-8 rounded-full border border-gray-300 px-2 text-[11px] sm:px-2.5 sm:text-xs font-semibold text-gray-700 inline-flex items-center justify-center whitespace-nowrap shrink-0">
              Belépés
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}