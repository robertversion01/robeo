import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderDemoInvoiceHtml, type InvoiceRow } from '@/lib/demoInvoice';
import { getSupabaseAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invoice id required' }, { status: 400 });
    }

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Auth config missing' }, { status: 500 });
    }

    let userId: string | null = null;
    if (token) {
      const authClient = createClient(url, anon);
      const {
        data: { user },
      } = await authClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    const { data: invoice, error } = await db
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (userId && invoice.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meta = (invoice.meta || {}) as Record<string, string | null>;
    const { data: tx } = await db
      .from('transactions')
      .select('created_at, product_id')
      .eq('id', invoice.transaction_id)
      .maybeSingle();

    let productName = meta.product_name || 'Termék';
    if (tx?.product_id && !meta.product_name) {
      const { data: product } = await db
        .from('products')
        .select('name')
        .eq('id', tx.product_id)
        .maybeSingle();
      productName = product?.name || productName;
    }

    const html = renderDemoInvoiceHtml({
      invoice: invoice as InvoiceRow,
      productName,
      buyerEmail: meta.buyer_email || '—',
      sellerEmail: meta.seller_email || '—',
      purchaseDate: tx?.created_at
        ? new Date(tx.created_at).toLocaleString('hu-HU')
        : new Date(invoice.created_at).toLocaleString('hu-HU'),
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.html"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Download failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
