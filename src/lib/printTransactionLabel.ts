import { supabase } from '@/lib/supabase';
import { downloadFoxpostLabel } from '@/lib/foxpostLabel';

export type PrintLabelResult = {
  trackingNumber?: string;
  status?: string;
  openedPopup: boolean;
};

/** Foxpost címke megnyitása + nyomtatás (popup vagy letöltés fallback). */
export async function printTransactionLabel(
  transactionId: string,
  options?: {
    userEmail?: string | null;
    productNameFallback?: string;
    productId?: string | null;
    buyerId?: string | null;
  },
): Promise<PrintLabelResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Nincs bejelentkezve.');
  }

  const res = await fetch('/api/transactions/foxpost-label', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      transactionId,
      productId: options?.productId ?? undefined,
      buyerId: options?.buyerId ?? undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = String(data.error || '');
    if (/transaction not found/i.test(msg)) {
      throw new Error('A tranzakció nem található.');
    }
    throw new Error(msg || 'Címke generálás sikertelen');
  }

  const label = data.label;
  const { openedPopup } = downloadFoxpostLabel({
    transactionId,
    productName: label?.productName || options?.productNameFallback || 'Termék',
    trackingNumber: data.trackingNumber,
    sellerEmail: label?.sellerEmail || options?.userEmail || undefined,
    foxpostTerminalId: label?.foxpostTerminalId,
    foxpostTerminalName: label?.foxpostTerminalName,
    foxpostTerminalAddress: label?.foxpostTerminalAddress,
    buyerAddress: label?.foxpostTerminalAddress,
  });

  return {
    trackingNumber: data.trackingNumber,
    status: data.status,
    openedPopup,
  };
}
