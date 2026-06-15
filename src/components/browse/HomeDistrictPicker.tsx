'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BUDAPEST_DISTRICTS, getDistrictLabel } from '@/lib/budapestDistricts';
import { supabase } from '@/lib/supabase';
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences';
import { toast } from 'sonner';

type Props = {
  className?: string;
};

/** RobeoBP — otthoni kerület beállítása (feed-boost). */
export default function HomeDistrictPicker({ className }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadUserPreferences(supabase).then((prefs) => {
      setValue(prefs.feed.homeDistrict || '');
      setLoaded(true);
    });
  }, []);

  const save = async (next: string) => {
    setValue(next);
    setSaving(true);
    try {
      const prefs = await loadUserPreferences(supabase);
      await saveUserPreferences(supabase, {
        ...prefs,
        feed: { ...prefs.feed, homeDistrict: next || undefined },
      });
      toast.success(
        next
          ? t('bp.homeDistrict.saved', { district: getDistrictLabel(next) })
          : t('bp.homeDistrict.cleared'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <section
      className={cn(
        'rounded-xl border border-emerald-500/20 bg-emerald-50/50 px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <MapPin size={14} className="text-emerald-700 shrink-0" aria-hidden />
        <p className="text-xs font-semibold text-emerald-900">{t('bp.homeDistrict.label')}</p>
        <select
          value={value}
          disabled={saving}
          onChange={(e) => void save(e.target.value)}
          className="ml-auto h-9 min-w-[140px] rounded-lg border border-emerald-200 bg-white px-2 text-xs text-gray-800"
        >
          <option value="">{t('bp.homeDistrict.none')}</option>
          {BUDAPEST_DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-[11px] text-emerald-800/80">{t('bp.homeDistrict.hint')}</p>
      {value ? (
        <Link
          href={`/browse?dist=${encodeURIComponent(value)}#catalog`}
          className="mt-1 inline-block text-[11px] font-semibold text-[#007782] hover:underline"
        >
          {t('bp.homeDistrict.browseLink')} →
        </Link>
      ) : null}
    </section>
  );
}
