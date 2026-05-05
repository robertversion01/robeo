'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
      <Link href="/" className="text-2xl font-bold tracking-wider hover:text-accent transition-colors">ROBEO</Link>
      
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link href="/messages" className="hover:text-accent transition-colors font-medium">Üzenetek</Link>
            <Link href="/favorites" className="hover:text-accent transition-colors font-medium">Kedvencek</Link>
            <Link href="/upload" className="hover:text-accent transition-colors font-medium">Feltöltés</Link>
            <Link href="/profile" className="hover:text-accent transition-colors font-medium">Profil</Link>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 border border-white/30 rounded-full hover:bg-white hover:text-black transition-all duration-300"
            >
              Kijelentkezés
            </button>
          </>
        ) : (
          <Link href="/auth" className="px-6 py-2 border border-white/30 rounded-full hover:bg-white hover:text-black transition-all duration-300">
            Belépés
          </Link>
        )}
      </div>
    </nav>
  );
}