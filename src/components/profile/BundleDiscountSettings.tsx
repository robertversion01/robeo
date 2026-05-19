'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DEFAULT_BUNDLE_TIERS, type BundleTier } from '@/lib/vintedCatalog';
import { fetchSellerBundleDiscountSettings } from '@/lib/bundleDiscount';

type Props = {
  userId: string | null | undefined;
};

export default function BundleDiscountSettings({ userId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<BundleTier[]>([...DEFAULT_BUNDLE_TIERS]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const settings = await fetchSellerBundleDiscountSettings(supabase, userId);
      setEnabled(settings.enabled);
      setTiers(settings.tiers);
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bundle_discount_enabled: enabled,
          bundle_discount_tiers: tiers,
        })
        .eq('id', userId);
      if (error) throw error;
      toast.success('Csomagkedvezmény beállítások mentve.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mentés sikertelen.');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">📦 Csomagkedvezmények</h2>
      <p className="text-xs text-gray-500 mb-3">
        Vinted-stílus: a vevő több termékedet vásárolva kedvezményt kap (checkoutnál).
      </p>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-gray-300 text-[#007782]"
        />
        Csomagkedvezmény bekapcsolása
      </label>
      <ul className="space-y-2 text-sm text-gray-700 mb-3">
        {tiers.map((t) => (
          <li key={t.items} className="flex justify-between rounded-lg bg-white border border-gray-200 px-3 py-2">
            <span>{t.items}+ termék</span>
            <span className="font-semibold text-[#007782]">−{t.percent}%</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="btn-base btn-primary text-sm"
      >
        {saving ? 'Mentés…' : 'Beállítások mentése'}
      </button>
    </section>
  );
}
