'use client';

import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUserStats } from '@/hooks/useUserStats';
import StarRating from '@/components/review/StarRating';
import OffersList from '@/components/product/OffersList';
import BuyerOffersList from '@/components/product/BuyerOffersList';
import TransactionList from '@/components/profile/TransactionList';
import ProductGrid from '@/components/product/ProductGrid';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import type { Product } from '@/types';
import { MAIN_TOP_PADDING, MOBILE_PAGE_BOTTOM_CLASS } from '@/lib/layoutTokens';
import { Bell, ChevronDown } from 'lucide-react';
import { revalidateCatalog } from '@/app/actions/revalidateCatalog';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';
import { softDeleteAllUserProducts, softDeleteProduct } from '@/lib/productSoftDelete';
import WalletBalanceCard from '@/components/profile/WalletBalanceCard';
import BundleDiscountSettings from '@/components/profile/BundleDiscountSettings';
import AdminReportedItems from '@/components/admin/AdminReportedItems';
import AdminDac7Report from '@/components/admin/AdminDac7Report';
import MyInvoices from '@/components/profile/MyInvoices';
import ProfileTabNav, { type ProfileTabId } from '@/components/profile/ProfileTabNav';
import ProfileSection from '@/components/profile/ProfileSection';
import ProfileSettingsHub from '@/components/profile/ProfileSettingsHub';
import ProfileSignOutBar from '@/components/profile/ProfileSignOutBar';
import SellerEngagementHub from '@/components/seller/SellerEngagementHub';
import PromoteAnalyticsCard from '@/components/profile/PromoteAnalyticsCard';
import ProfileMarketplaceStats from '@/components/profile/ProfileMarketplaceStats';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { markProductPromoteBoosted } from '@/lib/promoteAnalytics';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [promotingProductIds, setPromotingProductIds] = useState<Set<string>>(new Set());
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<Set<string>>(new Set());
  const [runningImageAudit, setRunningImageAudit] = useState(false);
  const [featuredDrafts, setFeaturedDrafts] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [createdAt, setCreatedAt] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTabId>('shop');
  const [listingFavoriteCount, setListingFavoriteCount] = useState(0);
  const shopCount = products.length + soldProducts.length;

  const setProfileTab = (tab: ProfileTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    params.set('tab', tab);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  };

  const { stats, loading: statsLoading } = useUserStats(user?.id, statsTick);
  const { isAdmin } = useIsAdmin(user?.id);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tab = new URLSearchParams(window.location.search).get('tab') as ProfileTabId | null;
    if (tab && ['shop', 'reviews', 'invoices', 'about'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const promoteStatus = params.get('promote');

    if (promoteStatus === 'success') {
      toast.success('Sikeres kiemelés! Terméked 7 napig a főoldalon marad.');
      params.delete('promote');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
      if (user?.id) {
        loadUserProducts(user.id);
      }
    } else if (promoteStatus === 'cancelled') {
      toast.error('A kiemelési fizetés megszakadt.');
      params.delete('promote');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [user?.id, user?.email]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);
    setCreatedAt(user.created_at || '');
    loadUserProducts(user.id);
    loadSoldProducts(user.id);
    loadReceivedReviews(user.id);
  };

  useEffect(() => {
    if (isAdmin && user?.id) {
      loadAllProductsForAdmin();
    }
  }, [isAdmin, user?.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  };

  const loadUserProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .or('status.is.null,status.neq.deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListingFavoriteCount = async (userId: string) => {
    try {
      const { data: listingIds } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);
      const ids = (listingIds || []).map((r) => r.id as string).filter(Boolean);
      if (ids.length === 0) {
        setListingFavoriteCount(0);
        return;
      }
      const { count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .in('product_id', ids);
      setListingFavoriteCount(count ?? 0);
    } catch {
      setListingFavoriteCount(0);
    }
  };

  const loadSoldProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'sold')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSoldProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching sold products:', error);
    }
  };

  const loadReceivedReviews = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReceivedReviews((data || []) as Array<{ id: string; rating: number; comment: string | null; created_at: string }>);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const loadAllProductsForAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const allProducts = (data || []) as Product[];
      setAdminProducts(allProducts);
      setFeaturedDrafts(
        allProducts.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.featured_until
            ? new Date(item.featured_until).toISOString().slice(0, 16)
            : '';
          return acc;
        }, {})
      );
    } catch (error) {
      console.error('Error fetching admin products:', error);
      toast.error('Nem sikerult betolteni az admin termeklistat');
    }
  };

  const refreshCatalogAndProfile = async (userId: string) => {
    try {
      await revalidateCatalog();
    } catch (revalidateErr) {
      console.warn('[profile] revalidateCatalog failed', revalidateErr);
    }
    notifyCatalogUpdated();
    await loadUserProducts(userId);
    setSoldProducts([]);
    router.refresh();
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    const productId = deleteTarget.id;
    const snapshot = products;

    setDeleteBusy(true);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setDeleteTarget(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProducts(snapshot);
        toast.error('Jelentkezz be újra.');
        return;
      }

      const result = await softDeleteProduct(supabase, productId, user.id);
      if (!result.ok) throw new Error(result.error);

      toast.success('Hirdetés törölve. A termék többé nem látható a piactéren.');
      setStatsTick((t) => t + 1);
      await refreshCatalogAndProfile(user.id);
    } catch (error) {
      console.error('Error deleting product:', error);
      setProducts(snapshot);
      toast.error(
        error instanceof Error
          ? error.message
          : 'A törlés nem sikerült (hálózat vagy jogosultság). Semmi sem változott a listádon.',
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmBulkDeleteAll = async () => {
    const snapshot = [...products];
    if (snapshot.length === 0) {
      setBulkDeleteOpen(false);
      return;
    }

    setBulkBusy(true);
    setProducts([]);
    setBulkDeleteOpen(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProducts(snapshot);
        toast.error('Jelentkezz be újra.');
        return;
      }

      const result = await softDeleteAllUserProducts(supabase, user.id);
      if (!result.ok) throw new Error(result.error);

      toast.success(
        result.count > 0
          ? `${result.count} hirdetés törölve — nem látszanak a piactéren.`
          : 'Nincs törlendő hirdetés.',
      );
      setStatsTick((t) => t + 1);
      await refreshCatalogAndProfile(user.id);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      setProducts(snapshot);
      toast.error(
        error instanceof Error ? error.message : 'Az összes törlése nem sikerült. A listád változatlan.',
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const promoteProductToHero = async (productId: string) => {
    if (!user?.id) {
      toast.error('A kiemeleshez be kell jelentkezned.');
      return;
    }

    setPromotingProductIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      const response = await fetch('/api/stripe/promote-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userId: user.id }),
      });

      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Nem sikerult elinditani a kiemelest');
      }

      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error?.message || 'Hiba tortent a kiemeles inditasakor');
      setPromotingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const updateFeaturedUntilAsAdmin = async (productId: string) => {
    if (!isAdmin) return;

    setUpdatingFeaturedIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      const rawValue = featuredDrafts[productId];
      const featuredUntil = rawValue ? new Date(rawValue).toISOString() : null;

      if (featuredUntil && new Date(featuredUntil).getTime() > Date.now()) {
        await markProductPromoteBoosted(supabase, productId, featuredUntil);
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            featured_until: featuredUntil,
            promote_demo_views: 0,
            promote_demo_clicks: 0,
          })
          .eq('id', productId);
        if (error) throw error;
      }

      setAdminProducts((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, featured_until: featuredUntil } : item
        )
      );
      setProducts((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, featured_until: featuredUntil } : item
        )
      );
      toast.success('Kiemelesi datum frissitve');
    } catch (error) {
      console.error('Error updating featured_until:', error);
      toast.error('Nem sikerult frissiteni a kiemelesi datumot');
    } finally {
      setUpdatingFeaturedIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const runImageAuditAsAdmin = async () => {
    if (!isAdmin) return;

    setRunningImageAudit(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Nincs érvényes munkamenet.');
      }

      const response = await fetch('/api/admin/image-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'A képek audit futtatása sikertelen.');
      }

      toast.success(
        `Képek audit kész: ${data.fixed} javítva, ${data.unchanged} változatlan.`
      );
      await loadAllProductsForAdmin();
      await loadUserProducts(user.id);
    } catch (error: any) {
      console.error('Error running admin image audit:', error);
      toast.error(error?.message || 'Nem sikerült lefuttatni a képek auditot.');
    } finally {
      setRunningImageAudit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    clothing: 'Ruházat',
    shoes: 'Cipő',
    accessories: 'Kiegészítők',
    electronics: 'Elektronika',
    other: 'Egyéb'
  };

  const isProductFeatured = (product: Product) =>
    typeof product.featured_until === 'string' &&
    new Date(product.featured_until).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!deleteBusy) setDeleteTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-product-title" className="text-lg font-bold text-gray-900">
              Hirdetés törlése?
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Biztosan törlöd ezt a hirdetést? Ez a művelet nem visszavonható — a termék eltűnik a
              piactérről (technikai értelemben megjelölés törlésként). Csak a saját hirdetéseidet
              törölheted; ezt az adatbázis RLS szabályai is kényszerítik.
            </p>
            <p className="text-xs text-gray-500 mt-2 font-medium">„{deleteTarget.name}”</p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="flex-1 btn-base btn-secondary"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
              >
                Mégse
              </button>
              <button
                type="button"
                className="flex-1 btn-base btn-danger"
                disabled={deleteBusy}
                onClick={confirmDeleteProduct}
              >
                {deleteBusy ? 'Törlés…' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkDeleteOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!bulkBusy) setBulkDeleteOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-title"
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-red-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="bulk-delete-title" className="text-lg font-bold text-red-800">
              Összes hirdetés törlése?
            </h3>
            <p className="text-sm text-gray-700 mt-3">
              Ez <strong>minden aktív</strong> hirdetésedet eltávolítja a piactérről egyszerre. Nem
              vonható vissza; csak új feltöltéssel jelenhetsz meg újra.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Érintett hirdetések száma: <strong>{products.length}</strong>
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="flex-1 btn-base btn-secondary"
                disabled={bulkBusy}
                onClick={() => setBulkDeleteOpen(false)}
              >
                Mégse
              </button>
              <button
                type="button"
                className="flex-1 btn-base btn-danger"
                disabled={bulkBusy || products.length === 0}
                onClick={() => void confirmBulkDeleteAll()}
              >
                {bulkBusy ? 'Törlés…' : 'Összes törlése'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className={`${MAIN_TOP_PADDING} ${MOBILE_PAGE_BOTTOM_CLASS} px-3 md:px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] text-lg md:text-xl font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{t('profile.title')}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>
                  {t('profile.memberSince', {
                    date: createdAt ? formatDate(createdAt) : '—',
                  })}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{t('profile.productCount', { count: stats.totalProducts })}</span>
              </div>
            </div>
          </div>

          <ProfileTabNav
            active={activeTab}
            onChange={setProfileTab}
            counts={{
              shop: shopCount,
              reviews: receivedReviews.length,
            }}
          />

          <ProfileMarketplaceStats
            soldCount={stats.soldProducts}
            revenue={stats.totalRevenue}
            rating={stats.averageRating}
            listingsCount={stats.totalProducts}
            favoritesOnListings={listingFavoriteCount}
          />
          <TrustSafetyBlock variant="compact" className="mb-6" />

          {activeTab === 'about' ? (
            <>
              <ProfileSettingsHub userId={user?.id} />
              <ProfileSection title={t('profile.incomingOffers')}>
                <OffersList />
              </ProfileSection>
              <ProfileSection title={t('profile.sentOffers')}>
                <BuyerOffersList />
              </ProfileSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-[#007782] text-xs uppercase tracking-wider mb-1">
                    {t('profile.stats.revenue')}
                  </div>
                  <div className="text-xl font-bold">{formatPrice(stats.totalRevenue)}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-[#007782] text-xs uppercase tracking-wider mb-1">
                    {t('profile.stats.sold')}
                  </div>
                  <div className="text-xl font-bold">{stats.soldProducts}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-[#007782] text-xs uppercase tracking-wider mb-1">
                    {t('profile.stats.listings')}
                  </div>
                  <div className="text-xl font-bold">{stats.totalProducts}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-[#007782] text-xs uppercase tracking-wider mb-1">
                    {t('profile.stats.rating')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{stats.averageRating.toFixed(1)}</span>
                    <StarRating rating={stats.averageRating} size={16} />
                  </div>
                </div>
              </div>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">{t('profile.transactions')}</h2>
                  <Link href="/orders" className="text-xs font-semibold text-[#007782] hover:underline">
                    {t('orders.viewAll')} →
                  </Link>
                </div>
                <Suspense fallback={<div className="text-sm text-gray-500 py-4">{t('common.loading')}</div>}>
                  <TransactionList />
                </Suspense>
              </div>
              <WalletBalanceCard userId={user?.id} />
              <Link
                href="/notifications"
                className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Bell size={18} className="text-[#007782]" />
                  {t('nav.notifications')}
                </span>
                <span className="text-xs text-gray-500">→</span>
              </Link>
              <BundleDiscountSettings userId={user?.id} />
            </>
          ) : null}

          {isAdmin && activeTab === 'about' ? (
            <details className="group mb-8 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100/80 [&::-webkit-details-marker]:hidden">
                <span>🛠️ Adminisztrációs beállítások (Kattints a megnyitáshoz)</span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="border-t border-gray-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">Kiemelés kezelése</h2>
                <button
                  type="button"
                  onClick={runImageAuditAsAdmin}
                  disabled={runningImageAudit}
                  className="h-9 rounded-md border border-[#007782] bg-white px-3 text-xs font-semibold text-[#007782] hover:bg-[#007782]/5 disabled:cursor-wait disabled:opacity-60"
                >
                  {runningImageAudit ? 'Képek audit fut...' : 'Képek audit futtatása'}
                </button>
              </div>
              {adminProducts.length === 0 ? (
                <p className="text-sm text-gray-500">Nincs megjeleníthető termék.</p>
              ) : (
                <div className="space-y-2">
                  {adminProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col md:flex-row md:items-center gap-2 justify-between rounded-lg border border-gray-200 bg-white p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.category} · {item.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                          onClick={() => updateFeaturedUntilAsAdmin(item.id)}
                          className="h-9 rounded-md bg-[#007782] px-3 text-xs font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
                        >
                          {updatingFeaturedIds.has(item.id) ? 'Mentés...' : 'Mentés'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <AdminReportedItems />
              <AdminDac7Report />
              </div>
            </details>
          ) : null}

          {activeTab === 'shop' ? (
            <>
          <PromoteAnalyticsCard userId={user?.id} />
          <SellerEngagementHub products={products} />
          <ProfileSection
            title={t('profile.myListings')}
            action={
              <button
                type="button"
                disabled={products.length === 0 || bulkBusy}
                onClick={() => setBulkDeleteOpen(true)}
                className="btn-base btn-danger text-xs px-3 disabled:opacity-50"
              >
                {t('profile.deleteAll')}
              </button>
            }
          >
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-3">{t('profile.emptyListings')}</p>
              <Link href="/upload" className="text-[#007782] font-semibold hover:underline">
                {t('profile.uploadFirst')} →
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">{t('profile.productCount', { count: products.length })}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden relative"
                  >
                    <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block">
                      {product.image_url ? (
                        <img 
                          src={getOptimizedImageUrl(product.image_url, 300, 85)} 
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          📷
                        </div>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget({ id: product.id, name: product.name });
                      }}
                      className="absolute top-1.5 right-1.5 z-20 bg-red-500/90 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[10px] transition-colors touch-manipulation"
                    >
                      {t('profile.deleteListing')}
                    </button>

                    <div className="p-1.5 space-y-0.5">
                      <div className="text-gray-500 text-[8px] uppercase tracking-wider">
                        {categoryLabels[product.category] || product.category}
                      </div>
                      <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800">{product.name}</h3>
                      <div className="text-accent font-bold text-xs">{formatPrice(product.price)}</div>
                      <button
                        type="button"
                        disabled={isProductFeatured(product) || promotingProductIds.has(product.id)}
                        onClick={() => promoteProductToHero(product.id)}
                        className={`w-full mt-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                          isProductFeatured(product)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                            : promotingProductIds.has(product.id)
                              ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-wait'
                              : 'bg-[#007782] text-white hover:bg-[#00616b]'
                        }`}
                      >
                        {isProductFeatured(product)
                          ? t('profile.promoted')
                          : promotingProductIds.has(product.id)
                            ? t('profile.promoting')
                            : t('profile.promoteHero')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          </ProfileSection>

          <ProfileSection title={t('profile.soldItems')}>
            {soldProducts.length === 0 ? (
              <p className="text-sm text-gray-500">{t('profile.emptySold')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {soldProducts.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="aspect-[4/5] overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={getOptimizedImageUrl(product.image_url, 300, 85)}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">📷</div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800">{product.name}</h3>
                      <div className="text-accent font-bold text-xs">{formatPrice(product.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ProfileSection>

            </>
          ) : null}

          {activeTab === 'reviews' ? (
          <ProfileSection title={t('profile.reviews')}>
            {receivedReviews.length === 0 ? (
              <p className="text-sm text-gray-500">{t('profile.noReviews')}</p>
            ) : (
              <div className="space-y-3">
                {receivedReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <StarRating rating={review.rating} size={16} />
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString(
                          i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU',
                        )}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="text-sm mt-2 text-gray-700">{review.comment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>
          ) : null}

          {activeTab === 'invoices' ? (
            <div className="mb-8">
              <MyInvoices userId={user?.id} />
            </div>
          ) : null}

          <ProfileSignOutBar />
        </div>
      </main>
    </div>
  );
}