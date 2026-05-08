'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
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
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const mode = params.get('mode');
    if (view === 'sign_up' || mode === 'register') {
      setIsLogin(false);
      return;
    }
    if (view === 'sign_in' || mode === 'login') {
      setIsLogin(true);
    }
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
        toast.success('✅ Sikeres regisztráció!');
        router.push('/profile');
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

  const switchMode = () => {
    const next = !isLogin;
    setIsLogin(next);
    router.replace(`/auth?view=${next ? 'sign_in' : 'sign_up'}`);
  };

  return (
    <div className="min-h-screen w-full mt-0 pt-0 bg-[#0f1a1d] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-[#142327] border border-[#22353a] rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-center mb-6 text-white">
            {isLogin ? 'Belépés' : 'Regisztráció'}
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <div className="mb-5 rounded-xl border border-[#2a3f44] bg-[#102024] px-3 py-2 text-center text-xs uppercase tracking-wide text-gray-300">
            Regisztráció és belépés e-mail címmel
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-200">E-mail cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full min-h-11 px-4 rounded-xl border border-[#2f4a50] bg-[#0f1d21] text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4baab5]"
                placeholder="pelda@email.com"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-200">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full min-h-11 px-4 rounded-xl border border-[#2f4a50] bg-[#0f1d21] text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4baab5]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#4baab5] text-black text-base font-semibold inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Folyamatban...' : isLogin ? 'Belépés' : 'Regisztráció'}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-300">
            {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}
            <button
              onClick={switchMode}
              className="text-[#4baab5] hover:underline ml-1 font-medium"
            >
              {isLogin ? 'Regisztrálj' : 'Jelentkezz be'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}