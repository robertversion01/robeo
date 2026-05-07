'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, Search, Plus } from 'lucide-react';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ searchQuery, onSearchChange }: NavbarProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-2 py-2 flex items-center justify-between gap-2 bg-white dark:bg-black/20 backdrop-blur-md border-b border-gray-100 dark:border-white/5 shadow-sm">
      <Link href="/" className="text-base font-bold tracking-wider hover:text-accent transition-colors flex-shrink-0 text-gray-900 dark:text-white">
        VINTED
      </Link>

      {onSearchChange ? (
        <div className="flex-1 max-w-md min-w-0 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" size={16} />
            <input 
              type="text" 
              placeholder="Keresés..." 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-white/10 rounded-full text-xs border border-transparent focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>
      ) : null}
      
      <div className="flex items-center gap-0.5 md:gap-2">
        {loading ? (
          <div className="w-16 h-7 animate-pulse bg-gray-100 dark:bg-white/10 rounded-full"></div>
        ) : user ? (
          <>
            <Link href="/upload" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <Plus size={18} className="text-gray-700 dark:text-white" />
            </Link>
            <Link href="/messages" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative">
              <MessageCircle size={18} className="text-gray-700 dark:text-white" />
            </Link>
            <Link href="/favorites" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <Heart size={18} className="text-gray-700 dark:text-white" />
            </Link>
            <Link href="/profile" className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <User size={18} className="text-gray-700 dark:text-white" />
            </Link>
          </>
        ) : (
          <Link href="/auth" className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-white/30 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 text-gray-800 dark:text-white">
            Belépés
          </Link>
        )}
      </div>
    </nav>
  );
}