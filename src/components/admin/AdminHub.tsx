'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { markProductPromoteBoosted } from '@/lib/promoteAnalytics';
import AdminReportedItems from '@/components/admin/AdminReportedItems';
import AdminDac7Report from '@/components/admin/AdminDac7Report';
import ProfileSection from '@/components/profile/ProfileSection';

type Props = {
  /** Reserved for future admin-scoped actions */
  userId?: string;
};

export default function AdminHub({ userId }: Props) {
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [featuredDrafts, setFeaturedDrafts] = useState<Record<string, string>>({});
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<Set<string>>(new Set());
  const [runningImageAudit, setRunningImageAudit] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAllProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const all = (data || []) as Product[];
      setAdminProducts(all);
      setFeaturedDrafts(
        all.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.featured_until
            ? new Date(item.featured_until).toISOString().slice(0, 16)
            : '';
          return acc;
        }, {}),
      );
    } catch (error) {
      console.error('[AdminHub] load products', error);
      toast.error('Nem sikerült betölteni a terméklistát.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllProducts();
  }, [loadAllProducts]);

  const updateFeaturedUntil = async (productId: string) => {
    setUpdatingFeaturedIds((prev) => new Set(prev).add(productId));
    try {
      const rawValue = featuredDrafts[productId];
      const featuredUntil = rawValue ? new Date(rawValue).toISOString() : null;

      if (featuredUntil && new Date(featuredUntil).getTime() > Date.now()) {
        await markProductPromoteBoosted(supabase, productId, featuredUntil);
      } else {
        const { error } = await supabase
          .from('products')
          .update({ featured_until: featuredUntil, promote_demo_views: 0, promote_demo_clicks: 0 })
          .eq('id', productId);
        if (error) throw error;
      }

      setAdminProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, featured_until: featuredUntil } : item)),
      );
      toast.success('Kiemelési dátum frissítve.');
    } catch (error) {
      console.error('[AdminHub] featured update', error);
      toast.error('Nem sikerült frissíteni a kiemelést.');
    } finally {
      setUpdatingFeaturedIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const runImageAudit = async () => {
    setRunningImageAudit(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Nincs érvényes munkamenet.');

      const response = await fetch('/api/admin/image-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Audit sikertelen.');

      toast.success(`Képek audit: ${data.fixed} javítva, ${data.unchanged} változatlan.`);
      await loadAllProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Audit hiba.');
    } finally {
      setRunningImageAudit(false);
    }
  };

  const activeCount = adminProducts.filter(
    (p) => p.status !== 'deleted' && (!p.status || p.status === 'active'),
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#007782]/20 bg-[#007782]/5 px-4 py-3">
        <p className="text-sm font-semibold text-[#007782]">Admin mód</p>
        <p className="text-xs text-gray-600 mt-1">
          Piactér moderálás és kiemelés kezelése. Aktív listázások: {activeCount}.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Admin fiók — moderálás</p>
        <p className="mt-1 text-xs text-amber-900/90">
          Termékfeltöltéshez és vásárláshoz a teszt seller / buyer fiókot használd (
          <code className="rounded bg-white/80 px-1">docs/TEST_ACCOUNTS.md</code>
          ). Itt csak kiemelés, audit és jelentések.
        </p>
      </div>

      <ProfileSection
        title="Kiemelés és képek"
        description="Főoldali kiemelés dátuma és hibás képek javítása."
        action={
          <button
            type="button"
            onClick={runImageAudit}
            disabled={runningImageAudit}
            className="h-9 rounded-lg border border-[#007782] bg-white px-3 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5 disabled:opacity-60"
          >
            {runningImageAudit ? 'Audit…' : 'Képek audit'}
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Betöltés…</p>
        ) : adminProducts.length === 0 ? (
          <p className="text-sm text-gray-500">Nincs termék.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2">
            {adminProducts.slice(0, 40).map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2.5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {item.status || 'active'} · {item.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="datetime-local"
                    value={featuredDrafts[item.id] || ''}
                    onChange={(e) =>
                      setFeaturedDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="h-9 rounded-md border border-gray-300 px-2 text-xs"
                  />
                  <button
                    type="button"
                    disabled={updatingFeaturedIds.has(item.id)}
                    onClick={() => void updateFeaturedUntil(item.id)}
                    className="h-9 rounded-md bg-[#007782] px-3 text-xs font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
                  >
                    Mentés
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Jelentések" description="Felhasználók által jelentett hirdetések.">
        <AdminReportedItems />
      </ProfileSection>

      <ProfileSection title="DAC7 jelentés" description="Demo export admin célokra.">
        <AdminDac7Report />
      </ProfileSection>
    </div>
  );
}
