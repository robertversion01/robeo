'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { isPaidStatus } from '@/lib/transactionFlow';
import ClientFormattedTime from '@/components/ui/ClientFormattedTime';
import { useTranslation } from 'react-i18next';
import { focusOrderPanel, requestPrintLabel } from '@/lib/orderPanelActions';
import { printTransactionLabel } from '@/lib/printTransactionLabel';
import { useResolvedTransactionRole } from '@/hooks/useResolvedTransactionRole';
import SystemMessageRoleBadge from '@/components/messages/SystemMessageRoleBadge';
import { toast } from 'sonner';

type Props = {
  content: string;
  productId: string | null;
  createdAt: string;
  viewerId: string;
  senderId: string;
  receiverId: string;
  sellerId?: string | null;
  timeLocale?: string;
};

type ProductSnippet = { id: string; name: string; price: number; user_id?: string };

export default function SaleSystemMessageCard({
  productId,
  createdAt,
  viewerId,
  senderId,
  receiverId,
  sellerId: sellerIdProp = null,
  timeLocale = 'hu-HU',
}: Props) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductSnippet | null>(null);
  const [txPaid, setTxPaid] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setTxPaid(false);
      setTxId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: productRow } = await supabase
        .from('products')
        .select('id, name, price, user_id')
        .eq('id', productId)
        .maybeSingle();

      if (cancelled) return;
      if (productRow) {
        setProduct({
          id: productRow.id,
          name: productRow.name,
          price: Number(productRow.price) || 0,
          user_id: productRow.user_id,
        });
      }

      const sellerId = productRow?.user_id ?? sellerIdProp;
      const buyerId =
        sellerId && senderId === sellerId
          ? receiverId
          : sellerId && receiverId === sellerId
            ? senderId
            : null;

      let tx: { id: string; status: string } | null = null;
      if (sellerId && buyerId) {
        const txResult = await supabase
          .from('transactions')
          .select('id, status')
          .eq('product_id', productId)
          .eq('seller_id', sellerId)
          .eq('buyer_id', buyerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        tx = txResult.data;
      }

      if (!cancelled) {
        setTxId(tx?.id ?? null);
        setTxPaid(Boolean(tx?.status && isPaidStatus(String(tx.status))));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, senderId, receiverId, sellerIdProp]);

  const sellerId = product?.user_id ?? sellerIdProp;
  const buyerId =
    sellerId && senderId === sellerId
      ? receiverId
      : sellerId && receiverId === sellerId
        ? senderId
        : null;
  const role = useResolvedTransactionRole(viewerId, sellerId);
  const isSeller = role === 'seller';

  const title =
    role === null
      ? t('systemMessage.loading')
      : isSeller
        ? t('saleMessage.sellerTitle')
        : t('saleMessage.buyerTitle');
  const body =
    role === null
      ? t('systemMessage.loadingHint')
      : isSeller
        ? t('saleMessage.sellerBody')
        : t('saleMessage.buyerBody');

  const runDirectPrint = async () => {
    if (!txId) {
      toast.info(t('chatTransaction.panelUnavailable'));
      return;
    }
    try {
      const data = await printTransactionLabel(txId, {
        productNameFallback: product?.name,
        productId,
        buyerId,
      });
      toast.success(t('chatTransaction.labelDownloaded'));
      if (!data.openedPopup) {
        toast.info(t('chatTransaction.printPopupBlocked'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chatTransaction.updateFailed'));
    }
  };

  const handleSellerAction = () => {
    if (!txPaid) {
      if (!focusOrderPanel()) toast.info(t('chatTransaction.panelUnavailable'));
      return;
    }
    const { panelFound } = requestPrintLabel(productId);
    if (!panelFound) {
      toast.info(t('chatTransaction.panelUnavailable'));
      void runDirectPrint();
    }
  };

  const handleBuyerAction = () => {
    if (!focusOrderPanel()) toast.info(t('chatTransaction.panelUnavailable'));
  };

  return (
    <div className="max-w-md rounded-xl border border-emerald-700/45 bg-emerald-950/35 px-4 py-3 text-sm text-[#e7edf0]">
      {role ? (
        <div className="flex justify-center mb-1">
          <SystemMessageRoleBadge role={role} />
        </div>
      ) : null}
      <p className="text-center font-semibold text-emerald-200">{title}</p>
      <p className="text-center text-xs text-[#b2c0c6] mt-1 leading-snug">{body}</p>
      {product && (
        <Link
          href={`/products/${product.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#007782]/25 bg-[#1a2328] px-3 py-2 hover:bg-[#007782]/5"
        >
          <span className="font-semibold text-[#007782] truncate">{product.name}</span>
          <span className="shrink-0 font-bold tabular-nums">{formatPrice(product.price)}</span>
        </Link>
      )}
      {role === 'seller' ? (
        <button
          type="button"
          disabled={!txPaid && !txId}
          onClick={handleSellerAction}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#007782] px-4 min-h-11 py-2 text-sm font-semibold text-white disabled:opacity-50 touch-manipulation"
        >
          <Printer size={16} />
          {txPaid ? t('chatTransaction.printLabel') : t('chatTransaction.openShipping')}
        </button>
      ) : null}
      {role === 'buyer' ? (
        <button
          type="button"
          onClick={handleBuyerAction}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[#007782]/40 bg-[#1a2328] px-4 min-h-11 py-2 text-sm font-semibold text-[#007782] touch-manipulation"
        >
          {t('chatTransaction.viewOrderThread')}
        </button>
      ) : null}
      {role === 'seller' && !txPaid ? (
        <p className="mt-2 text-[10px] text-center text-amber-300">{t('saleMessage.awaitingPaymentSync')}</p>
      ) : null}
      <div className="mt-2 text-center text-[10px] text-[#6b7d85]">
        <ClientFormattedTime iso={createdAt} locale={timeLocale} />
      </div>
    </div>
  );
}

export function shouldUseSaleSystemCard(
  content: string,
  messageType?: string | null,
  productId?: string | null,
): boolean {
  if (!productId || messageType !== 'system') return false;
  return (
    content.includes('[ROBEO_SALE]') ||
    content.includes('sikeresen kifizették') ||
    content.includes('Sikeresen kifizetted')
  );
}
