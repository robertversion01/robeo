'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import RegistrationLegalConsent from '@/components/auth/RegistrationLegalConsent';
import { supabase } from '@/lib/supabase';
import { LEGAL_CONTACT, LEGAL_VERSION } from '@/lib/legalConstants';
import {
  isProfileRegistrationComplete,
  isValidUsername,
  normalizeUsername,
  usernameFromEmail,
} from '@/lib/profileRegistration';
import { readReturnUrlFromSearch, sanitizeReturnUrl } from '@/lib/returnUrl';

function MaterialField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string | null;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={id === 'fullName' ? 'name' : 'username'}
        className={`w-full border-0 border-b bg-transparent py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${
          error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#007782]'
        }`}
        placeholder={label}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AuthCompletePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/browse');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReturnUrl(sanitizeReturnUrl(readReturnUrlFromSearch(window.location.search), '/browse'));
  }, []);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth?view=sign_up');
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name, legal_accepted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (isProfileRegistrationComplete(profile)) {
        router.replace(returnUrl);
        return;
      }

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.name) {
        setUsername(profile.name);
      } else if (user.email) {
        setUsername(usernameFromEmail(user.email));
      }

      const marketing = user.user_metadata?.robeo_marketing_opt_in;
      if (typeof marketing === 'boolean') setMarketingOptIn(marketing);

      setLoading(false);
    })();
  }, [router, returnUrl]);

  const checkUsername = useCallback(
    async (raw: string, uid: string | null) => {
      const normalized = normalizeUsername(raw);
      if (!normalized) {
        setUsernameError(null);
        setUsernameSuggestion(null);
        return;
      }

      if (!isValidUsername(normalized)) {
        setUsernameError(t('auth.complete.usernameInvalid'));
        setUsernameSuggestion(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const params = new URLSearchParams({ username: normalized });
        if (uid) params.set('excludeId', uid);
        const res = await fetch(`/api/auth/check-username?${params}`);
        const data = (await res.json()) as {
          available?: boolean;
          suggestion?: string;
        };

        if (data.available) {
          setUsernameError(null);
          setUsernameSuggestion(null);
        } else {
          setUsernameError(t('auth.complete.usernameTaken'));
          if (data.suggestion) setUsernameSuggestion(data.suggestion);
        }
      } catch {
        setUsernameError(null);
      } finally {
        setCheckingUsername(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!userId || loading) return;
    const timer = setTimeout(() => {
      void checkUsername(username, userId);
    }, 400);
    return () => clearTimeout(timer);
  }, [username, userId, loading, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const trimmedName = fullName.trim();
    const normalized = normalizeUsername(username);

    if (!trimmedName) {
      toast.error(t('auth.complete.fullNameRequired'));
      return;
    }
    if (!isValidUsername(normalized)) {
      toast.error(t('auth.complete.usernameInvalid'));
      return;
    }
    if (!acceptedLegal) {
      toast.error(t('auth.legalRequired'));
      return;
    }
    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          name: normalized,
          legal_accepted_at: now,
          legal_version: LEGAL_VERSION,
          updated_at: now,
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      await supabase.auth.updateUser({
        data: {
          robeo_marketing_opt_in: marketingOptIn,
          robeo_legal_version: LEGAL_VERSION,
        },
      });

      toast.success(t('auth.complete.success'));
      router.replace(returnUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.errors.generic');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-500">
        {t('auth.processing')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
          {t('auth.complete.title')}
        </h1>

        <p className="mt-2 text-center text-sm text-gray-500">{t('auth.complete.progressHint')}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <MaterialField
            id="fullName"
            label={t('auth.complete.fullNameLabel')}
            value={fullName}
            onChange={setFullName}
            hint={t('auth.complete.fullNameHint')}
          />

          <div>
            <MaterialField
              id="username"
              label={t('auth.complete.usernameLabel')}
              value={username}
              onChange={setUsername}
              error={usernameError}
            />
            {usernameSuggestion ? (
              <div className="mt-3">
                <p className="text-xs text-gray-600">{t('auth.complete.usernameSuggested')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setUsername(usernameSuggestion);
                    setUsernameSuggestion(null);
                    setUsernameError(null);
                  }}
                  className="mt-2 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-800 hover:border-[#007782] hover:text-[#007782]"
                >
                  {usernameSuggestion}
                </button>
              </div>
            ) : null}
            {checkingUsername ? (
              <p className="mt-1 text-xs text-gray-400">{t('auth.complete.usernameChecking')}</p>
            ) : null}
          </div>

          <div className="space-y-5 pt-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#007782]"
              />
              <span className="text-sm leading-relaxed text-gray-800">{t('auth.marketingOptIn')}</span>
            </label>

            <RegistrationLegalConsent checked={acceptedLegal} onChange={setAcceptedLegal} />
          </div>

          <button
            type="submit"
            disabled={submitting || !acceptedLegal || Boolean(usernameError) || checkingUsername}
            className="mt-2 w-full rounded-md bg-[#007782] py-3.5 text-base font-semibold text-white transition hover:bg-[#006570] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('auth.processing') : t('auth.complete.continue')}
          </button>
        </form>

        <p className="mt-8 text-center">
          <a
            href={`mailto:${LEGAL_CONTACT.supportEmail}`}
            className="text-sm font-medium text-[#007782] hover:underline"
          >
            {t('auth.complete.problemLink')}
          </a>
        </p>
      </div>
    </div>
  );
}
