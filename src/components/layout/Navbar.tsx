'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, Search, Plus, LogOut } from 'lucide-react';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user?.id) {
        checkUnreadMessages(user.id);
      }
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
    const closeProfileMenu = () => setShowProfileMenu(false);
    window.addEventListener('messages:seen', handleSeen as EventListener);
    window.addEventListener('click', closeProfileMenu);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener('messages:seen', handleSeen as EventListener);
      window.removeEventListener('click', closeProfileMenu);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-1.5 flex items-center justify-between gap-2 bg-white border-b border-gray-200 shadow-sm">
      <Link href="/" className="text-base font-bold tracking-wide hover:text-[#007782] transition-colors flex-shrink-0 text-[#007782]">
        ROBEO
      </Link>

      {onSearchChange ? (
        <div className="flex-1 max-w-md min-w-0 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Keresés..." 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full input-base min-h-10 pl-8 pr-3 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-[#007782]"
            />
          </div>
        </div>
      ) : null}
      
      <div className="flex items-center gap-0.5 md:gap-2">
        {loading ? (
            <div className="w-20 h-9 animate-pulse bg-gray-100 rounded-full"></div>
        ) : user ? (
          <>
            <Link href="/upload" className="icon-btn text-gray-700">
              <Plus size={18} className="text-gray-700" />
            </Link>
            <Link href="/messages" className="icon-btn text-gray-700 relative">
              <MessageCircle size={18} className="text-gray-700" />
              {hasUnreadMessages ? (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
              ) : null}
            </Link>
            <Link href="/favorites" className="icon-btn text-gray-700">
              <Heart size={18} className="text-gray-700" />
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu((prev) => !prev);
                }}
                className="icon-btn text-gray-700"
                aria-label="Profil menü"
              >
                <User size={18} className="text-gray-700" />
              </button>
              {showProfileMenu ? (
                <div
                  className="absolute right-0 top-10 w-44 card-base shadow-md p-1 z-50"
                  onClick={(e) => e.stopPropagation()}
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
          <Link href="/auth" className="btn-base btn-secondary rounded-full px-3">
            Belépés
          </Link>
        )}
      </div>
    </nav>
  );
}