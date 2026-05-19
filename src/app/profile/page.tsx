'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';

export default function ProfilePage() {
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

  const { stats, loading: statsLoading } = useUserStats(user?.id, statsTick);
  const isAdmin = user?.email === 'hevesi.tr@gmail.com';

  useEffect(() => {
    checkUser();
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
        if (user.email === 'hevesi.tr@gmail.com') {
          loadAllProductsForAdmin();
        }
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
    if (user.email === 'hevesi.tr@gmail.com') {
      loadAllProductsForAdmin();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
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

      const { error } = await supabase
        .from('products')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Hirdetés törölve. A termék többé nem látható a piactéren.');
      setStatsTick((t) => t + 1);
      notifyCatalogUpdated();
    } catch (error) {
      console.error('Error deleting product:', error);
      setProducts(snapshot);
      toast.error(
        'A törlés nem sikerült (hálózat vagy jogosultság). Semmi sem változott a listádon.'
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

      const ids = snapshot.map((p) => p.id);
      const { error } = await supabase
        .from('products')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('A kijelölt hirdetéseid törölve — nem látszanak a piactéren.');
      setStatsTick((t) => t + 1);
      notifyCatalogUpdated();
    } catch (error) {
      console.error('Bulk delete error:', error);
      setProducts(snapshot);
      toast.error('Az összes törlése nem sikerült. A listád változatlan.');
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

      const { error } = await supabase
        .from('products')
        .update({ featured_until: featuredUntil })
        .eq('id', productId);

      if (error) throw error;

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
    if (!isAdmin || !user?.email) return;

    setRunningImageAudit(true);
    try {
      const response = await fetch('/api/admin/image-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: user.email }),
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

      <main className={`${MAIN_TOP_PADDING} pb-12 px-3 md:px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
              <div className="w-14 h-14 rounded-full bg-[#007782]/10 flex items-center justify-center text-[#007782] text-xl font-bold">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Profilom</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>Tag since {createdAt ? formatDate(createdAt) : 'now'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{stats.totalProducts} termék</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-5 ml-0">Saját feltöltött termékeim</p>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-base btn-danger"
            >
              Kijelentkezés
            </button>
          </div>

          {isAdmin ? (
            <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Admin - Kiemeles kezeles</h2>
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
                <p className="text-sm text-gray-500">Nincs megjelenitheto termek.</p>
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
            </div>
          ) : null}

          {/* Tranzakciók */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">💰 Tranzakcióim</h2>
            <TransactionList />
          </div>

          {/* Beérkező ajánlatok */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">📬 Beérkező ajánlataim</h2>
            <OffersList />
          </div>

          {/* Küldött ajánlatok (vevő) */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">📤 Küldött ajánlataim</h2>
            <BuyerOffersList />
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Összes bevétel</div>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Sikeres eladás</div>
              <div className="text-2xl font-bold">{stats.soldProducts} db</div>
              {stats.soldProducts > 0 && stats.totalRevenue > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Ø {Math.round(stats.totalRevenue / stats.soldProducts).toLocaleString('hu-HU')} Ft / eladás
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Feltöltött hirdetések</div>
              <div className="text-2xl font-bold">{stats.totalProducts} db</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-accent text-xs uppercase tracking-wider mb-1">Értékelés</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</span>
                <StarRating rating={stats.averageRating} size={16} />
                <span className="text-gray-400 text-xs">({stats.reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Saját hirdetések */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">📦 Saját hirdetéseim</h2>
            <button
              type="button"
              disabled={products.length === 0 || bulkBusy}
              onClick={() => setBulkDeleteOpen(true)}
              className="btn-base btn-danger text-xs px-3 disabled:opacity-50"
            >
              Összes törlése
            </button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-3">Még nincs feltöltött terméked</p>
              <Link href="/upload" className="text-accent hover:underline">Töltsd fel az első termékedet →</Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-4">{products.length} termék</p>
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
                      onClick={() =>
                        setDeleteTarget({ id: product.id, name: product.name })
                      }
                      className="absolute top-1.5 right-1.5 bg-red-500/90 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[10px] transition-colors"
                    >
                      Törlés
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
                          ? 'Kiemelve a Hero-ban'
                          : promotingProductIds.has(product.id)
                            ? 'Atiranyitas Stripe-ra...'
                            : 'Kiemeles a fooldalra (690 Ft / 7 nap)'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">✅ Eladott termékeim</h2>
            {soldProducts.length === 0 ? (
              <p className="text-sm text-gray-500">Még nincs eladott termék.</p>
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
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">⭐ Kapott értékelések</h2>
            {receivedReviews.length === 0 ? (
              <p className="text-sm text-gray-500">Még nincs értékelésed.</p>
            ) : (
              <div className="space-y-3">
                {receivedReviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <StarRating rating={review.rating} size={16} />
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('hu-HU')}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm mt-2 text-gray-700">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}