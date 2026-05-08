'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mode = new URLSearchParams(window.location.search).get('mode');
    setIsLogin(mode !== 'register');
  }, []);

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
        toast.success('✅ Sikeres regisztráció! Erősítsd meg az e-mail címedet.');
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

  const handleSocialClick = (provider: 'Google' | 'Facebook') => {
    toast.info(`${provider} belépés hamarosan elérhető.`);
  };

  const switchMode = () => {
    const next = !isLogin;
    setIsLogin(next);
    router.replace(`/auth?mode=${next ? 'login' : 'register'}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8 text-3xl font-bold tracking-wider text-[#007782] hover:text-[#00616b] transition-colors">
          ROBEO
        </Link>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">
            {isLogin ? 'Belépés' : 'Regisztráció'}
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              className="w-full min-h-11 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium transition-colors"
            >
              Google belépés
            </button>
            <button
              type="button"
              onClick={() => handleSocialClick('Facebook')}
              className="w-full min-h-11 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium transition-colors"
            >
              Facebook belépés
            </button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">vagy e-mail címmel</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700">E-mail cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              className="w-full min-h-11 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#007782] focus:ring-1 focus:ring-[#007782] transition-all"
                placeholder="pelda@email.com"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full min-h-11 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#007782] focus:ring-1 focus:ring-[#007782] transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 py-3 bg-[#007782] text-white font-semibold rounded-xl hover:bg-[#00616b] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Folyamatban...' : isLogin ? 'Belépés' : 'Regisztráció'}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-500">
            {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}
            <button
              onClick={switchMode}
              className="text-[#007782] hover:underline ml-1 font-medium"
            >
              {isLogin ? 'Regisztrálj' : 'Jelentkezz be'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}