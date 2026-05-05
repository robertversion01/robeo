'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        // Signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('✅ Sikeres regisztráció! Erősítsd meg az e-mail címedet.');
      }
    } catch (err: any) {
      let errorMessage = 'Hiba történt';
      
      const errorTranslations: Record<string, string> = {
        'Email not confirmed': 'Kérjük, igazold vissza az e-mail címedet a bejelentkezés előtt!',
        'Invalid login credentials': 'Hibás e-mail cím vagy jelszó!',
        'Invalid email': 'Kérjük érvényes e-mail címet adj meg!',
        'Password should be at least 6 characters': 'A jelszónak minimum 6 karakter hosszúnak kell lennie!',
        'User already registered': 'Ez az e-mail cím már regisztrálva van!',
        'Email rate limit exceeded': 'Túl sok kérés érkezett erről az címről. Kérjük próbáld újra később.'
      };

      if (err.message && errorTranslations[err.message]) {
        errorMessage = errorTranslations[err.message];
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8 text-3xl font-bold tracking-wider hover:text-accent transition-colors">
          ROBEO
        </Link>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            {isLogin ? 'Belépés' : 'Regisztráció'}
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl p-3 mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 font-medium text-white/90">E-mail cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="pelda@email.com"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-white/90">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
            >
              {loading ? 'Folyamatban...' : isLogin ? 'Belépés' : 'Regisztráció'}
            </button>
          </form>

          <div className="mt-8 text-center text-white/60">
            {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent hover:underline ml-1 font-medium"
            >
              {isLogin ? 'Regisztrálj' : 'Jelentkezz be'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}