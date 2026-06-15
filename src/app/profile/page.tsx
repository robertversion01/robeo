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
import { DESKTOP_TOP_PADDING } from '@/lib/layoutTokens';
import { Bell } from 'lucide-react';
import { revalidateCatalog } from '@/app/actions/revalidateCatalog';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';
import { enrichProductsWithFavoriteCounts } from '@/lib/favoriteCounts';
import { softDeleteAllUserProducts, softDeleteProduct } from '@/lib/productSoftDelete';
import {
  ACTIVE_LISTING_STATUS_FILTER,
  canPromoteProduct,
  isActiveListing,
} from '@/lib/listedProducts';
import WalletBalanceCard from '@/components/profile/WalletBalanceCard';
import BundleDiscountSettings from '@/components/profile/BundleDiscountSettings';
import AdminHub from '@/components/admin/AdminHub';
import ProfileTabNav, { type ProfileTabId } from '@/components/profile/ProfileTabNav';
import ProfileMobileOrdersHeader from '@/components/profile/ProfileMobileOrdersHeader';
import ProfileSection from '@/components/profile/ProfileSection';
import ProfileSettingsHub from '@/components/profile/ProfileSettingsHub';
import ProfileSignOutBar from '@/components/profile/ProfileSignOutBar';
import OrdersQuickHub from '@/components/profile/OrdersQuickHub';
import SellerEngagementHub from '@/components/seller/SellerEngagementHub';
import SellerInsightsPanel from '@/components/seller/SellerInsightsPanel';
import ProfileMarketplaceStats from '@/components/profile/ProfileMarketplaceStats';
import TrustSafetyBlock from '@/components/trust/TrustSafetyBlock';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { isProfileRegistrationComplete } from '@/lib/profileRegistration';
import { ROBEO_BP_MODE } from '@/lib/features';
import { relistProduct } from '@/lib/relistListing';
import { RotateCcw } from 'lucide-react';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Array<{ id: string; rating: number; comment: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [promotingProductIds, setPromotingProductIds] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [createdAt, setCreatedAt] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [relistBusyId, setRelistBusyId] = useState<string | null>(null);
  const [statsTick, setStatsTick] = useState(0);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTabId>('shop');
  const [listingFavoriteCount, setListingFavoriteCount] = useState(0);
  const shopCount = products.length + soldProducts.length;

  const setProfileTab = (tab: ProfileTabId) => {
    if (tab === 'admin' && !isAdmin) return;
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
    const params = new URLSearchParams(window.location.search);
    let tab = params.get('tab') as ProfileTabId | 'about' | null;
    if (tab === 'about') {
      tab = 'settings';
      params.set('tab', 'settings');
      router.replace(`/profile?${params.toString()}`, { scroll: false });
    }
    if (tab === 'admin' && !isAdmin) {
      setActiveTab('shop');
      params.set('tab', 'shop');
      router.replace(`/profile?${params.toString()}`, { scroll: false });
      return;
    }
    if (tab && ['shop', 'reviews', 'settings', 'admin'].includes(tab)) {
      setActiveTab(tab as ProfileTabId);
    }
  }, [isAdmin, router]);

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, name, legal_accepted_at')
      .eq('id', user.id)
      .maybeSingle();

    if (!isProfileRegistrationComplete(profile)) {
      router.replace('/auth/complete');
      return;
    }

    setUser(user);
    setCreatedAt(user.created_at || '');
    loadUserProducts(user.id);
    loadSoldProducts(user.id);
    loadReceivedReviews(user.id);
    void loadListingFavoriteCount(user.id);
  };

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
        .or(ACTIVE_LISTING_STATUS_FILTER)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = ((data || []) as Product[]).filter((p) => isActiveListing(p.status));
      const enriched = await enrichProductsWithFavoriteCounts(supabase, rows);
      setProducts(enriched);
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
      const enriched = await enrichProductsWithFavoriteCounts(supabase, (data || []) as Product[]);
      setSoldProducts(enriched);
    } catch (error) {
      console.error('Error fetching sold products:', error);
    }
  };

  const handleRelist = async (productId: string) => {
    if (!user?.id || relistBusyId) return;
    setRelistBusyId(productId);
    try {
      const result = await relistProduct(supabase, productId, user.id);
      if ('error' in result) {
        toast.error(t('profile.relistFailed'));
        return;
      }
      toast.success(t('profile.relistSuccess'));
      await Promise.all([loadUserProducts(user.id), loadSoldProducts(user.id)]);
      try {
        await revalidateCatalog();
      } catch {
        /* non-fatal */
      }
      notifyCatalogUpdated();
    } finally {
      setRelistBusyId(null);
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

  const refreshCatalogAndProfile = async (userId: string) => {
    try {
      await revalidateCatalog();
    } catch (revalidateErr) {
      console.warn('[profile] revalidateCatalog failed', revalidateErr);
    }
    notifyCatalogUpdated();
    await loadUserProducts(userId);
    await loadSoldProducts(userId);
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

    const target = products.find((p) => p.id === productId);
    if (target && !canPromoteProduct(target.status)) {
      toast.error(t('profile.cannotPromoteSold'));
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
    <div className="min-h-screen bg-[#0f1a1d] md:bg-white text-gray-900">
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

      <ProfileMobileOrdersHeader />

      <main className={`px-0 md:px-6 ${DESKTOP_TOP_PADDING}`}>
        <div className="relative z-10 mx-auto max-w-7xl -mt-5 rounded-t-[1.25rem] bg-white px-3 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:shadow-none">
          <div className="flex items-center gap-3 mb-3 md:mb-2">
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
            showAdmin={isAdmin}
            counts={{
              shop: shopCount,
              reviews: receivedReviews.length,
            }}
          />

          {activeTab === 'shop' ? (
            <>
          <OrdersQuickHub className="hidden md:grid" />
          <WalletBalanceCard userId={user?.id} />
          <ProfileMarketplaceStats
            soldCount={stats.soldProducts}
            revenue={stats.totalRevenue}
            rating={stats.averageRating}
            listingsCount={stats.totalProducts}
            favoritesOnListings={listingFavoriteCount}
          />
          <TrustSafetyBlock variant="compact" className="mb-6" />
          {user?.id ? <SellerInsightsPanel sellerId={user.id} /> : null}
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
                    <Link href={`/products/${product.id}`} className="aspect-[4/5] overflow-hidden block relative">
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
                      {canPromoteProduct(product.status) ? (
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
                      ) : null}
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
                  <div key={product.id} className="group bg-white border border-gray-200 rounded-lg overflow-hidden relative">
                    <Link href={`/products/${product.id}`} className="block">
                    <div className="aspect-[4/5] overflow-hidden relative">
                      {product.image_url ? (
                        <img
                          src={getOptimizedImageUrl(product.image_url, 300, 85)}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover opacity-70 grayscale group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">📷</div>
                      )}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          {t('product.sold')}
                        </span>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <h3 className="font-medium text-[11px] truncate leading-tight text-gray-800">{product.name}</h3>
                      <div className="text-gray-500 font-bold text-xs">{formatPrice(product.price)}</div>
                    </div>
                    </Link>
                    <button
                      type="button"
                      disabled={relistBusyId === product.id}
                      onClick={() => void handleRelist(product.id)}
                      className="mx-1.5 mb-1.5 flex w-[calc(100%-0.75rem)] items-center justify-center gap-1 rounded-lg border border-[#007782]/30 bg-[#007782]/5 py-1.5 text-[10px] font-bold text-[#007782] hover:bg-[#007782]/10 disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      {relistBusyId === product.id ? t('profile.relistBusy') : t('profile.relist')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>

            </>
          ) : null}

          {activeTab === 'settings' ? (
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
              {/* RobeoBP: a klasszikus "Tranzakciók" lista (TransactionList)
                  shipping_status / wallet release / Foxpost-cimke alapu, BP-ben
                  ezek nem futnak. A foglalasok a chatben jelennek meg, igy a
                  teljes blokk rejtve. V1 valtozatlan. */}
              {!ROBEO_BP_MODE ? (
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
              ) : null}
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

          {isAdmin && activeTab === 'admin' ? (
            <ProfileSection title={t('profile.adminTitle')}>
              <AdminHub userId={user?.id} />
            </ProfileSection>
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

          <ProfileSignOutBar />
        </div>
      </main>
    </div>
  );
}