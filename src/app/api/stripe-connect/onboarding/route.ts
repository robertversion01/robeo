import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-client';
import { appBaseUrl, isConnectAccountReady } from '@/lib/stripeConnect';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
    }

    const body = await req.json();
    const { userId, email } = body as { userId?: string; email?: string };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = (getSupabaseAdminClient() || getSupabaseClient()) as any;
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const { data: profileRaw } = await db
      .from('profiles')
      .select('connected_account_id, stripe_account_id, email')
      .eq('id', userId)
      .maybeSingle();

    const profile = profileRaw as {
      connected_account_id?: string | null;
      stripe_account_id?: string | null;
      email?: string | null;
    } | null;

    const userEmail = email || profile?.email || undefined;
    let accountId = profile?.connected_account_id || profile?.stripe_account_id || null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'HU',
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { robeo_user_id: userId },
      });
      accountId = account.id;

      await db
        .from('profiles')
        .update({
          connected_account_id: accountId,
          stripe_account_id: accountId,
        })
        .eq('id', userId);
    }

    const base = appBaseUrl();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/profile?connect=refresh`,
      return_url: `${base}/profile?connect=success`,
      type: 'account_onboarding',
    });

    const account = await stripe.accounts.retrieve(accountId);
    const onboarded = isConnectAccountReady(account);

    if (onboarded) {
      await db
        .from('profiles')
        .update({
          stripe_connect_onboarded: true,
          stripe_connect_details_submitted: Boolean(account.details_submitted),
          connected_account_id: accountId,
          stripe_account_id: accountId,
        })
        .eq('id', userId);
    }

    return NextResponse.json({
      url: accountLink.url,
      accountId,
      onboarded,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onboarding failed';
    console.error('[stripe-connect/onboarding]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
