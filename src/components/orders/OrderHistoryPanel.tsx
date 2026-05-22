'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { orderStatusI18nKey } from '@/lib/orderStatusI18n';
import { TX_STATUS } from '@/lib/transactionFlow';
import { cn } from '@/lib/utils';
import { Package, ChevronRight } from 'lucide-react';
import DisputePanel from '@/components/orders/DisputePanel';
import BundleOrderLineItems from '@/components/orders/BundleOrderLineItems';
import { isBundleTransaction } from '@/lib/bundleLineItems';
import { canBuyerOpenDispute } from '@/lib/disputes';

type OrderTab = 'purchases' | 'sales';

type TransactionRow = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  created_at: string;
  bundle_product_ids?: string | null;
  bundle_item_count?: number | null;
  dispute_status?: string | null;
  product?: { id: string; name: string; image_url: string | null };
  counterparty_email?: string | null;
};

type Props = {
  initialTab?: OrderTab;
};

export default function OrderHistoryPanel({ initialTab = 'purchases' }: Props) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<OrderTab>(initialTab);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq(tab === 'purchases' ? 'buyer_id' : 'seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setRows([]);
      setLoading(false);
      return;
    }

    const txs = data as TransactionRow[];
    const productIds = [...new Set(txs.map((x) => x.product_id).filter(Boolean))];
    const otherIds = [
      ...new Set(
        txs.flatMap((x) => (tab === 'purchases' ? [x.seller_id] : [x.buyer_id])).filter(Boolean),
      ),
    ];

    let productMap: Record<string, TransactionRow['product']> = {};
    let emailMap: Record<string, string> = {};

    if (productIds.length) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, image_url')
        .in('id', productIds);
      productMap = (products || []).reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, TransactionRow['product']>,
      );
    }

    if (otherIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', otherIds);
      emailMap = (profiles || []).reduce(
        (acc, p) => {
          acc[p.id] = p.email;
          return acc;
        },
        {} as Record<string, string>,
      );
    }

    setRows(
      txs.map((tx) => ({
        ...tx,
        product: productMap[tx.product_id],
        counterparty_email:
          tab === 'purchases' ? emailMap[tx.seller_id] : emailMap[tx.buyer_id],
      })),
    );
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTabAndUrl = (next: OrderTab) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', next);
      window.history.replaceState({}, '', `/orders?${params.toString()}`);
    }
  };

  const getStatusLabel = (status: string) => t(orderStatusI18nKey(status));

  const detailHref = (tx: TransactionRow) => {
    const otherId = tab === 'purchases' ? tx.seller_id : tx.buyer_id;
    return `/messages?with=${otherId}`;
  };

  return (
    <div>
      <div className="flex rounded-xl border border-gray-200 p-1 mb-6 bg-gray-50">
        <button
          type="button"
          onClick={() => setTabAndUrl('purchases')}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors touch-manipulation',
            tab === 'purchases' ? 'bg-white text-[#007782] shadow-sm' : 'text-gray-600',
          )}
        >
          {t('orders.purchases')}
        </button>
        <button
          type="button"
          onClick={() => setTabAndUrl('sales')}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors touch-manipulation',
            tab === 'sales' ? 'bg-white text-[#007782] shadow-sm' : 'text-gray-600',
          )}
        >
          {t('orders.sales')}
        </button>
      </div>

      {tab === 'sales' ? (
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t('orders.salesHint')}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#007782] border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">
            {tab === 'purchases' ? t('orders.emptyPurchases') : t('orders.emptySales')}
          </p>
          <Link href="/browse" className="inline-block mt-4 text-sm font-semibold text-[#007782] hover:underline">
            {t('orders.browse')} →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((tx) => (
            <li key={tx.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <Link
                href={detailHref(tx)}
                className="flex gap-3 p-3 hover:border-[#007782]/40 hover:bg-[#007782]/5 transition-colors touch-manipulation"
              >
                <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {tx.product?.image_url ? (
                    <img
                      src={getOptimizedImageUrl(tx.product.image_url, 128, 85)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">📷</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 items-start">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      {isBundleTransaction(tx)
                        ? t('orders.bundleTitle', { count: tx.bundle_item_count || 2 })
                        : tx.product?.name || '—'}
                    </h3>
                    <span className="text-sm font-bold text-[#007782] tabular-nums shrink-0">
                      {formatPrice(tx.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {tx.counterparty_email ? ` · ${tx.counterparty_email}` : ''}
                  </p>
                  <span className="inline-block mt-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700">
                    {getStatusLabel(tx.status)}
                  </span>
                </div>
                <ChevronRight size={18} className="shrink-0 text-gray-400 self-center" />
              </Link>
              {isBundleTransaction(tx) ? (
                <div className="px-3 pb-1">
                  <BundleOrderLineItems
                    transactionId={tx.id}
                    productId={tx.product_id}
                    bundleProductIds={tx.bundle_product_ids}
                    bundleItemCount={tx.bundle_item_count}
                  />
                </div>
              ) : null}
              {tab === 'purchases' &&
              (canBuyerOpenDispute(tx.status, tx.dispute_status) || tx.dispute_status) ? (
                <div className="px-3 pb-3">
                  <DisputePanel
                    transactionId={tx.id}
                    productName={tx.product?.name}
                    txStatus={tx.status}
                    disputeStatus={tx.dispute_status}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {tab === 'purchases' && rows.some((r) => r.status === TX_STATUS.ATVETELRE_VAR) ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          {t('orders.confirmHint')}
        </p>
      ) : null}
    </div>
  );
}
