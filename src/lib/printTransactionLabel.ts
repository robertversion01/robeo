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
  options?: { userEmail?: string | null; productNameFallback?: string },
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
    body: JSON.stringify({ transactionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Címke generálás sikertelen');

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
