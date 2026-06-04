/**
 * RobeoBP (Budapest Beta) — Lokális átvétel checkout endpoint.
 *
 * Cél: bypass-olja a Stripe Connect + wallet folyamatot, helyette egyszerűen
 * létrehoz egy `transactions` sort `local_pickup_pending` státusszal, és
 * rendszer-üzenetet küld a chatbe, hogy a vevő és az eladó egyeztessék a
 * személyes találkozót / fizetést.
 *
 * BIZTONSÁGI MEGFONTOLÁSOK:
 *   - Csak akkor érhető el, ha `NEXT_PUBLIC_ROBEO_MODE=bp` (build-time flag).
 *     V1 deploy esetén 404-et ad vissza, így nem alakul kibúvó út a Stripe
 *     körül.
 *   - A meglévő `resolveCheckout` validációkat (offer státusz, saját termék
 *     blokk, listed-product ellenőrzés) változatlanul használja.
 *   - Service role klienssel ír, hogy az RLS ne blokkolja a tranzakciót —
 *     de a request body buyerId-jét a server szinten validáljuk a Supabase
 *     auth session-höz képest.
 *   - termsAccepted szerver-oldali kötelező (ugyanaz a szabály, mint a V1
 *     wallet-pay endpoint-on).
 *   - Nincs Stripe API hívás. Nincs wallet debit. Nincs payment_intent.
 *     Csak DB insert + chat rendszer-üzenet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { resolveCheckout } from '@/lib/checkoutResolve';
import { insertChatSystemMessage } from '@/lib/chatMessages';
import { appBaseUrl } from '@/lib/stripeConnect';
import {
  ROBEO_BP_MODE,
  LOCAL_PICKUP_STATUS,
  LOCAL_PICKUP_PAYMENT_PROVIDER,
  LOCAL_PICKUP_SHIPPING_METHOD,
} from '@/lib/features';

export const dynamic = 'force-dynamic';

const LOCAL_PICKUP_SYSTEM_MESSAGE =
  '[ROBEO_LOCAL_PICKUP] Sikeres foglalás! Egyeztessétek a személyes találkozót, a helyszínt és a készpénzes vagy közvetlen fizetést itt a chatben.';

type Body = {
  productId?: string;
  offerId?: string;
  buyerId?: string;
  termsAccepted?: boolean;
};

export async function POST(req: NextRequest) {
  if (!ROBEO_BP_MODE) {
    return NextResponse.json(
      { error: 'Endpoint csak RobeoBP módban érhető el.' },
      { status: 404 },
    );
  }

  try {
    const body = (await req.json()) as Body;
    const { productId, offerId, buyerId } = body;

    if ((!productId && !offerId) || !buyerId) {
      return NextResponse.json(
        { error: 'Hiányzó vásárlási adatok.' },
        { status: 400 },
      );
    }

    if (body.termsAccepted !== true) {
      return NextResponse.json(
        { error: 'A foglaláshoz el kell fogadnod a feltételeket.' },
        { status: 400 },
      );
    }

    // Auth ellenőrzés: a buyerId egyezik az auth session userével.
    // Az anon kliens a bearer tokent használja, így a Supabase visszaadja a
    // sessiont. Service role-t csak az insert-re használunk.
    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (accessToken) {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        '';
      if (supabaseUrl && anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
        const { data: userResult } = await userClient.auth.getUser();
        if (userResult?.user?.id && userResult.user.id !== buyerId) {
          return NextResponse.json(
            { error: 'Auth eltérés — a buyerId nem egyezik a session-nel.' },
            { status: 403 },
          );
        }
      }
    }

    const db = getSupabaseAdminClient();
    if (!db) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }

    // A meglévő resolver kezeli az offer/product validációt, fizetési árat,
    // eladó lookupot. Bundle nem támogatott BP-ben (egyszerű lokális foglalás).
    const resolved = await resolveCheckout(db, {
      productId,
      offerId,
      buyerId,
      shippingCost: 0,
      bundleItemCount: 1,
    });

    const insertRow: Record<string, unknown> = {
      id: resolved.transactionId,
      product_id: resolved.productId,
      buyer_id: buyerId,
      seller_id: resolved.sellerId,
      // BP: a vevő a termék árát fizeti közvetlenül készpénzzel — fee, shipping = 0.
      amount: resolved.productPrice,
      fee: 0,
      shipping_method: LOCAL_PICKUP_SHIPPING_METHOD,
      shipping_cost: 0,
      status: LOCAL_PICKUP_STATUS,
      payment_provider: LOCAL_PICKUP_PAYMENT_PROVIDER,
      wallet_amount_paid: 0,
      bundle_item_count: 1,
      bundle_discount_percent: 0,
    };

    const { error: insertErr } = await db.from('transactions').insert(insertRow);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Offer csatolása (ha volt): jelöljük le, hogy a foglalás megtörtént —
    // de NEM frissítjük a státuszt, mert V1 offer flow attól függhet. Csak
    // a shipping_method/cost mezőt írjuk át, hogy konzisztens legyen.
    if (offerId) {
      await db
        .from('offers')
        .update({
          shipping_method: LOCAL_PICKUP_SHIPPING_METHOD,
          shipping_cost: 0,
        })
        .eq('id', offerId);
    }

    // STEP 4: rendszerüzenet a chatbe. A buyer és seller között már létezik
    // a beszélgetés (offer-flow vagy korábbi message). A messages tábla
    // szimpla sender→receiver párokkal dolgozik, message_type='system' →
    // a chat UI a SaleSystemMessageCard mintáját követő renderert választja
    // a [ROBEO_LOCAL_PICKUP] marker alapján.
    const msgResult = await insertChatSystemMessage(db, {
      senderId: resolved.sellerId,
      receiverId: buyerId,
      content: LOCAL_PICKUP_SYSTEM_MESSAGE,
      productId: resolved.productId,
    });

    if (!msgResult.ok) {
      console.warn(
        '[local-pickup] system message insert failed (non-fatal):',
        msgResult.error,
      );
    }

    const baseUrl = appBaseUrl();
    return NextResponse.json({
      mode: 'local_pickup',
      transactionId: resolved.transactionId,
      successUrl: `${baseUrl}/checkout/success?transaction_id=${resolved.transactionId}&local=1`,
      chatUrl: `${baseUrl}/messages?with=${resolved.sellerId}`,
      productId: resolved.productId,
      sellerId: resolved.sellerId,
      amount: resolved.productPrice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Local pickup failed';
    console.error('[local-pickup]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
