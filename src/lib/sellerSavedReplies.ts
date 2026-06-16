import type { SupabaseClient } from '@supabase/supabase-js';
import type { TFunction } from 'i18next';
import { ROBEO_BP_MODE } from '@/lib/features';

export type SellerSavedReply = {
  id: string;
  label: string;
  body: string;
  createdAt: string;
};

const STORAGE_KEY = 'robeo_seller_saved_replies_v1';
const META_KEY = 'robeo_saved_replies';
const MAX_CUSTOM = 8;

function readLocal(): SellerSavedReply[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SellerSavedReply[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SellerSavedReply[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_CUSTOM)));
}

/** Beepitett sablonok — mindig elerhetoek, nem kell menteni. */
export function getBuiltinSavedReplies(t: TFunction): SellerSavedReply[] {
  const base: SellerSavedReply[] = [
    {
      id: 'tpl-available',
      label: t('savedReplies.tpl.availableLabel'),
      body: t('savedReplies.tpl.availableBody'),
      createdAt: '1970-01-01T00:00:00.000Z',
    },
    {
      id: 'tpl-condition',
      label: t('savedReplies.tpl.conditionLabel'),
      body: t('savedReplies.tpl.conditionBody'),
      createdAt: '1970-01-01T00:00:00.000Z',
    },
  ];
  if (ROBEO_BP_MODE) {
    base.push({
      id: 'tpl-pickup',
      label: t('savedReplies.tpl.pickupLabel'),
      body: t('savedReplies.tpl.pickupBody'),
      createdAt: '1970-01-01T00:00:00.000Z',
    });
  } else {
    base.push({
      id: 'tpl-shipping',
      label: t('savedReplies.tpl.shippingLabel'),
      body: t('savedReplies.tpl.shippingBody'),
      createdAt: '1970-01-01T00:00:00.000Z',
    });
  }
  return base;
}

export async function fetchCustomSavedRepliesFromUser(
  supabase: SupabaseClient,
): Promise<SellerSavedReply[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const raw = user.user_metadata?.[META_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as SellerSavedReply[];
}

export async function persistCustomSavedRepliesToUser(
  supabase: SupabaseClient,
  items: SellerSavedReply[],
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.auth.updateUser({
    data: { [META_KEY]: items.slice(0, MAX_CUSTOM) },
  });
  if (error) {
    console.warn('[sellerSavedReplies] remote persist failed:', error.message);
  }
}

export async function loadCustomSavedRepliesMerged(
  supabase: SupabaseClient,
): Promise<SellerSavedReply[]> {
  const local = readLocal();
  const remote = await fetchCustomSavedRepliesFromUser(supabase);
  const map = new Map<string, SellerSavedReply>();
  for (const item of [...remote, ...local]) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.createdAt) > new Date(existing.createdAt)) {
      map.set(item.id, item);
    }
  }
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  writeLocal(merged);
  if (remote.length > 0 || local.length > 0) {
    await persistCustomSavedRepliesToUser(supabase, merged);
  }
  return merged.slice(0, MAX_CUSTOM);
}

/** Beepitett + egyedi sablonok — Q&A es review valaszhoz. */
export async function loadAllSavedReplies(
  supabase: SupabaseClient,
  t: TFunction,
): Promise<SellerSavedReply[]> {
  const custom = await loadCustomSavedRepliesMerged(supabase);
  return [...getBuiltinSavedReplies(t), ...custom];
}

export async function addCustomSavedReply(
  supabase: SupabaseClient,
  label: string,
  body: string,
): Promise<SellerSavedReply[]> {
  const entry: SellerSavedReply = {
    id: crypto.randomUUID(),
    label: label.trim().slice(0, 40) || body.trim().slice(0, 24),
    body: body.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  const current = await loadCustomSavedRepliesMerged(supabase);
  const next = [entry, ...current].slice(0, MAX_CUSTOM);
  writeLocal(next);
  await persistCustomSavedRepliesToUser(supabase, next);
  return next;
}

export async function removeCustomSavedReply(
  supabase: SupabaseClient,
  id: string,
): Promise<SellerSavedReply[]> {
  const current = await loadCustomSavedRepliesMerged(supabase);
  const next = current.filter((r) => r.id !== id);
  writeLocal(next);
  await persistCustomSavedRepliesToUser(supabase, next);
  return next;
}
