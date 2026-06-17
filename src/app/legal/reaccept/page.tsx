'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import RegistrationLegalConsent from '@/components/auth/RegistrationLegalConsent';
import { supabase } from '@/lib/supabase';
import { LEGAL_VERSION } from '@/lib/legalConstants';
import {
  isProfileRegistrationComplete,
  needsLegalReaccept,
} from '@/lib/profileRegistration';

export default function LegalReacceptPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, name, legal_accepted_at, legal_version')
        .eq('id', user.id)
        .maybeSingle();

      if (!isProfileRegistrationComplete(profile)) {
        router.replace('/auth/complete');
        return;
      }

      if (!needsLegalReaccept(profile)) {
        router.replace('/');
        return;
      }

      setUserId(user.id);
      setLoading(false);
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !acceptedLegal) {
      toast.error(t('auth.legalRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          legal_accepted_at: now,
          legal_version: LEGAL_VERSION,
          updated_at: now,
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.auth.updateUser({ data: { robeo_legal_version: LEGAL_VERSION } });
      toast.success(t('legalReaccept.success'));
      router.replace('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('auth.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a2328] text-[#8fa3ad]">
        {t('auth.processing')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a2328] px-4 py-10 text-[#e7edf0]">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e7edf0]">
          {t('legalReaccept.title')}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-[#8fa3ad]">
          {t('legalReaccept.body')}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <RegistrationLegalConsent checked={acceptedLegal} onChange={setAcceptedLegal} />

          <button
            type="submit"
            disabled={submitting || !acceptedLegal}
            className="w-full rounded-md bg-[#007782] py-3.5 text-base font-semibold text-white transition hover:bg-[#006570] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t('auth.processing') : t('legalReaccept.continue')}
          </button>
        </form>
      </div>
    </div>
  );
}
