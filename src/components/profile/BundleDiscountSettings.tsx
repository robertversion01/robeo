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

  const updateTier = (index: number, field: 'items' | 'percent', value: number) => {
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
  };

  const save = async () => {
    if (!userId) return;
    const valid = tiers.every(
      (t) => t.items >= 2 && t.percent >= 1 && t.percent <= 50,
    );
    if (!valid) {
      toast.error('A szintek: min. 2 termék, kedvezmény 1–50%.');
      return;
    }
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
    <section className="mb-8 rounded-xl border border-[#2a3941] bg-[#141d21] p-4">
      <h2 className="text-base font-bold text-[#e7edf0] mb-1">📦 Csomagkedvezmények</h2>
      <p className="text-xs text-[#8fa3ad] mb-3">
        Vinted-stílus: a vevő több termékedet vásárolva kedvezményt kap (checkoutnál).
      </p>
      <label className="flex items-center gap-2 text-sm font-medium text-[#e7edf0] mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-[#2a3941] text-[#007782]"
        />
        Csomagkedvezmény bekapcsolása
      </label>
      <ul className="space-y-2 text-sm text-[#b2c0c6] mb-3">
        {tiers.map((t, index) => (
          <li
            key={`${t.items}-${index}`}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-[#1a2328] border border-[#2a3941] px-3 py-2"
          >
            <label className="flex items-center gap-1 text-xs">
              <span className="text-[#8fa3ad]">Min.</span>
              <input
                type="number"
                min={2}
                max={20}
                value={t.items}
                onChange={(e) => updateTier(index, 'items', Number(e.target.value))}
                className="w-14 h-8 rounded border border-[#2a3941] px-2 text-center"
              />
              <span className="text-[#8fa3ad]">termék →</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="number"
                min={1}
                max={50}
                value={t.percent}
                onChange={(e) => updateTier(index, 'percent', Number(e.target.value))}
                className="w-14 h-8 rounded border border-[#2a3941] px-2 text-center"
              />
              <span className="font-semibold text-[#007782]">% kedvezmény</span>
            </label>
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
