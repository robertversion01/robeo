'use client';

import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

export default function ProfileSignOutBar() {
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="mt-8 border-t border-[#2a3941] pt-4 pb-2">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="btn-base btn-danger w-full sm:w-auto inline-flex items-center justify-center gap-2"
      >
        <LogOut size={16} />
        {t('nav.signOut')}
      </button>
    </div>
  );
}
