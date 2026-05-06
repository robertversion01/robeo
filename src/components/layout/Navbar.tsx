'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, User, Search, Plus } from 'lucide-react';

export default function Navbar() {
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
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-2.5 flex items-center justify-between gap-3 bg-black/20 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="text-lg font-bold tracking-wider hover:text-accent transition-colors flex-shrink-0">
        ROBEO
      </Link>

      <div className="flex-1 max-w-md min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text" 
            placeholder="Keresés..." 
            className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-full text-sm border border-white/10 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1 md:gap-3">
        {loading ? (
          <div className="w-20 h-8 animate-pulse bg-white/10 rounded-full"></div>
        ) : user ? (
          <>
            <Link href="/upload" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Plus size={20} />
            </Link>
            <Link href="/messages" className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
              <MessageCircle size={20} />
            </Link>
            <Link href="/favorites" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Heart size={20} />
            </Link>
            <Link href="/profile" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <User size={20} />
            </Link>
          </>
        ) : (
          <Link href="/auth" className="px-4 py-1.5 text-sm border border-white/30 rounded-full hover:bg-white hover:text-black transition-all duration-300">
            Belépés
          </Link>
        )}
      </div>
    </nav>
  );
}