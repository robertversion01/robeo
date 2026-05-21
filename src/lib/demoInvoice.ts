import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_COMPANY } from '@/lib/legalConstants';
import { formatPrice } from '@/lib/utils';

export type InvoiceRow = {
  id: string;
  transaction_id: string;
  user_id: string;
  invoice_number: string;
  total_amount: number;
  fee_amount: number;
  shipping_amount: number;
  product_amount: number;
  pdf_url: string | null;
  demo_mode: boolean;
  meta: Record<string, unknown>;
  created_at: string;
};

export type InvoiceRenderContext = {
  invoice: InvoiceRow;
  productName: string;
  buyerEmail: string;
  sellerEmail: string;
  purchaseDate: string;
};

export async function generateNextInvoiceNumber(
  db: SupabaseClient,
  year = new Date().getFullYear(),
): Promise<string> {
  const prefix = `INV-${year}-`;
  const { count, error } = await db
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`);

  if (error) {
    console.warn('[demoInvoice] count failed, using timestamp fallback', error.message);
    return `${prefix}${String(Date.now()).slice(-4)}`;
  }

  const seq = (count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export async function createDemoInvoiceForTransaction(
  db: SupabaseClient,
  params: {
    transactionId: string;
    buyerId: string;
    productId: string;
    amount: number;
    fee: number;
    shippingCost: number;
    productName?: string;
    buyerEmail?: string;
    sellerEmail?: string;
  },
): Promise<{ invoice: InvoiceRow | null; created: boolean }> {
  const productAmount = Math.max(
    0,
    Math.round(params.amount) - Math.round(params.fee || 0) - Math.round(params.shippingCost || 0),
  );
  const totalAmount = Math.round(params.amount);
  const feeAmount = Math.round(params.fee || 0);
  const shippingAmount = Math.round(params.shippingCost || 0);

  const { data: existing } = await db
    .from('invoices')
    .select('*')
    .eq('transaction_id', params.transactionId)
    .eq('user_id', params.buyerId)
    .maybeSingle();

  if (existing) {
    return { invoice: existing as InvoiceRow, created: false };
  }

  const invoiceNumber = await generateNextInvoiceNumber(db);
  const pdfUrl = `/api/invoices/__ID__/download`;

  const { data: inserted, error } = await db
    .from('invoices')
    .insert({
      transaction_id: params.transactionId,
      user_id: params.buyerId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      fee_amount: feeAmount,
      shipping_amount: shippingAmount,
      product_amount: productAmount,
      pdf_url: pdfUrl,
      demo_mode: true,
      meta: {
        product_id: params.productId,
        product_name: params.productName ?? null,
        buyer_email: params.buyerEmail ?? null,
        seller_email: params.sellerEmail ?? null,
      },
    })
    .select('*')
    .single();

  if (error) {
    console.error('[demoInvoice] insert failed', error.message);
    return { invoice: null, created: false };
  }

  const row = inserted as InvoiceRow;
  if (row.pdf_url?.includes('__ID__')) {
    const resolvedUrl = `/api/invoices/${row.id}/download`;
    await db.from('invoices').update({ pdf_url: resolvedUrl }).eq('id', row.id);
    row.pdf_url = resolvedUrl;
  }

  return { invoice: row, created: true };
}

export function renderDemoInvoiceHtml(ctx: InvoiceRenderContext): string {
  const { invoice, productName, buyerEmail, sellerEmail, purchaseDate } = ctx;
  const issued = new Date(invoice.created_at).toLocaleString('hu-HU');
  const productLine = formatPrice(invoice.product_amount);
  const feeLine = formatPrice(invoice.fee_amount);
  const shipLine = formatPrice(invoice.shipping_amount);
  const totalLine = formatPrice(invoice.total_amount);

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <title>${invoice.invoice_number} — ROBEO Demo számla</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; padding: 32px; color: #111; background: #f8fafb; }
    .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; }
    .demo-ribbon { background: #fef3c7; color: #92400e; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px; border-radius: 8px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #007782; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; text-align: left; }
    th { color: #6b7280; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { font-weight: 700; border-top: 2px solid #007782; font-size: 16px; }
    .footer { margin-top: 28px; font-size: 11px; color: #6b7280; line-height: 1.5; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="demo-ribbon">DEMO / TESZT MÓD — Nem minősül hivatalos adóügyi bizonylatnak</div>
    <h1>${DEMO_COMPANY.name}</h1>
    <p class="meta">
      ${DEMO_COMPANY.address}<br />
      Adószám: ${DEMO_COMPANY.taxId} · ${DEMO_COMPANY.registry}<br />
      ${DEMO_COMPANY.email}
    </p>
    <p class="meta"><strong>Számlaszám:</strong> ${invoice.invoice_number}<br />
    <strong>Kibocsátás:</strong> ${issued}<br />
    <strong>Tranzakció:</strong> ${invoice.transaction_id}</p>
    <table>
      <thead><tr><th>Tétel</th><th class="amount">Összeg</th></tr></thead>
      <tbody>
        <tr><td>Termék: ${escapeHtml(productName)}</td><td class="amount">${productLine}</td></tr>
        <tr><td>Vevővédelmi díj</td><td class="amount">${feeLine}</td></tr>
        <tr><td>Szállítás (Foxpost)</td><td class="amount">${shipLine}</td></tr>
        <tr class="total-row"><td>Fizetendő összesen</td><td class="amount">${totalLine}</td></tr>
      </tbody>
    </table>
    <p class="meta" style="margin-top:20px">
      <strong>Vevő:</strong> ${escapeHtml(buyerEmail)}<br />
      <strong>Eladó:</strong> ${escapeHtml(sellerEmail)}<br />
      <strong>Vásárlás dátuma:</strong> ${escapeHtml(purchaseDate)}
    </p>
    <div class="footer">
      Ez a bizonylat a ROBEO piactér demó számlázási rendszerének része. Éles NAV/Billingo integráció nélkül készült,
      kizárólag tesztelési és megfelelőségi folyamatok bemutatására.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
