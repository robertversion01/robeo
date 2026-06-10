'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  appendReturnUrl,
  readReturnUrlFromSearch,
  sanitizeReturnUrl,
} from '@/lib/returnUrl';

const AUTH_ERROR_KEYS: Record<string, string> = {
  'Email not confirmed': 'auth.errors.emailNotConfirmed',
  'Invalid login credentials': 'auth.errors.invalidCredentials',
  'Invalid email': 'auth.errors.invalidEmail',
  'Password should be at least 6 characters': 'auth.errors.passwordShort',
  'User already registered': 'auth.errors.userExists',
  'Email rate limit exceeded': 'auth.errors.rateLimit',
};

export default function AuthPage() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnUrl, setReturnUrl] = useState('/');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const mode = params.get('mode');
    setReturnUrl(sanitizeReturnUrl(readReturnUrlFromSearch(window.location.search)));
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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        toast.success(t('auth.successLogin'));
        router.push(returnUrl);
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        toast.success(t('auth.successRegisterCheckEmail'));
        router.push(appendReturnUrl('/auth/complete', returnUrl));
      }
    } catch (err: unknown) {
      let errorMessage = t('auth.errors.generic');
      const message = err instanceof Error ? err.message : '';
      if (message && AUTH_ERROR_KEYS[message]) {
        errorMessage = t(AUTH_ERROR_KEYS[message]);
      } else if (message) {
        errorMessage = message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    const next = !isLogin;
    setIsLogin(next);
    router.replace(
      appendReturnUrl(`/auth?view=${next ? 'sign_in' : 'sign_up'}`, returnUrl),
    );
  };

  return (
    <div className="min-h-screen w-full mt-0 pt-0 bg-[#0f1a1d] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-[#142327] border border-[#22353a] rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-center mb-2 text-white">
            {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          {!isLogin ? (
            <p className="text-center text-sm text-gray-400 mb-6">{t('auth.registerSubtitle')}</p>
          ) : (
            <div className="mb-6" />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <div className="mb-5 rounded-xl border border-[#2a3f44] bg-[#102024] px-3 py-2 text-center text-xs uppercase tracking-wide text-gray-300">
            {t('auth.emailHint')}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-200">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full min-h-11 px-4 rounded-xl border border-[#2f4a50] bg-[#0f1d21] text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4baab5]"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-200">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full min-h-11 px-4 rounded-xl border border-[#2f4a50] bg-[#0f1d21] text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4baab5]"
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#4baab5] text-black text-base font-semibold inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? t('auth.processing')
                : isLogin
                  ? t('auth.submitLogin')
                  : t('auth.submitRegister')}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-300">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <button
              onClick={switchMode}
              className="text-[#4baab5] hover:underline ml-1 font-medium"
            >
              {isLogin ? t('auth.switchRegister') : t('auth.switchLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
