# Handoff — céges gép → otthoni gép

**Dátum:** 2026-05-19  
**Remote:** `https://github.com/robertversion01/robeo.git`  
**Branch:** `main` (szinkronban `origin/main`-nel)  
**Utolsó commit:** `4d65116` — wallet checkout, follower notify E2E, chat sale/dispute UX

---

## Első lépések otthon

```bash
cd robeo
git pull origin main
npm install && npm run build
npm run dev
```

Ha nincs `npm` a PATH-ban: [Node.js LTS](https://nodejs.org/) telepítés, majd a fenti parancsok.

---

## Mit kell áthozni (NINCS a gitben)

| Fájl / titok | Miért kell |
|--------------|------------|
| **`.env.local`** | Supabase, Stripe, CRON_SECRET, Ollama URL, VAPID, Resend/SMTP |
| Supabase jelszókezelő | Dashboard → Project Settings ha kell SQL Editor |
| Stripe test kulcsok | Checkout / webhook lokálisan |

Másolás: USB, Bitwarden, vagy irodai `.env.local` másolat.

---

## Git / deploy állapot (2026-05-19)

- Working tree **clean**, minden push-olva `main`-re
- **Éles:** https://robeo.vercel.app
- Vercel Hobby: `vercel.json` max **1 cron/nap** (offer expiry a `saved-search-scan` worker végén fut)

### Utolsó commitok

```
4d65116 feat: wallet checkout, follower notify E2E, chat sale/dispute UX
553742e feat: Packeta picker, buyer counter-offer, disputes, and catalog polish
fb7180f feat: offer expiry + chat offers panel + profile bio
```

---

## Supabase SQL patch-ek

**Céges gépen futtatva (megerősítve):**

- `supabase/patch-offer-expiry.sql`
- `supabase/patch-profile-bio.sql`
- `supabase/patch-disputes.sql`
- `supabase/patch-vacation-mode.sql` (korábban)

**Ellenőrzés otthon:**

```bash
npm run db:check-patches
```

Ha piros: futtasd a hiányzó patch-et Supabase SQL Editorban, majd `NOTIFY pgrst, 'reload schema';` (a patch fájlok végén általában benne van).

---

## V1 kód backlog — KÉSZ

Lásd: `TODO-TOMORROW.md` — minden V1 kód item **[DONE]**.

### Utolsó session-ben beépítve

| Terület | Fájlok / megjegyzés |
|---------|---------------------|
| Packeta pickup | `src/lib/packetaPoint.ts`, `PacketaPointPicker.tsx`, checkout + wallet-pay |
| Buyer counter-offer | `src/lib/offerActions.ts`, `ChatBuyerOffersPanel.tsx` |
| Disputes (éles) | `patch-disputes.sql`, `DisputePanel`, `AdminDisputesPanel` |
| Offer expiry cron | `src/lib/offerExpiry.ts` → `saved-search-scan` worker |
| Wallet checkout | `CheckoutWalletOption.tsx`, `/api/checkout/wallet-pay` (csak **single**, bundle Stripe-only) |
| Follower notify | `followerNewItemNotify.ts`, upload után `/api/products/notify-followers` |
| Chat UX | `SaleSystemMessageCard`, buyer confirm receipt, dispute banner |

### Ismert korlátok / figyelmeztetések

- Pickup pontok: új semleges `pickup_point_*` + `pickup_provider` oszlopok (futtasd: `patch-pickup-points-rename.sql`); a régi `foxpost_terminal_*` deprecated, kód mindkettőbe ír
- Wallet checkout **nincs** bundle checkoutban
- Offer expiry a saved-search cronhoz van kötve (Hobby 1 slot)
- Packeta dev: statikus HU lista; live widgethez `NEXT_PUBLIC_PACKETA_API_KEY`
- Ollama: `localhost:11434`, chat: **llama3**, embedding: **nomic-embed-text**

---

## Szerepkörök (RBAC)

**Nincs** külön `seller` / `buyer` role a DB-ben.

| Szerep | Hogyan működik |
|--------|----------------|
| **Admin** | `profiles.role = 'admin'` — `node scripts/grant-admin-role.mjs your@email.com` |
| **Seller** | Bármely user feltölthet terméket (`user_id` a terméken) |
| **Buyer** | Bármely user vásárolhat (`buyer_id` tranzakcióban) |

Teszteléshez **3 külön email** ajánlott (admin / eladó / vevő). Részletek: `docs/TEST_ACCOUNTS.md`.

`AdminHub.tsx` hivatkozik `docs/TEST_ACCOUNTS.md`-re — most már létezik.

---

## [MANUAL / KÜLSŐ] — következő lépések (nem kód)

Részletes lépésenkénti útmutató: `docs/INFRA-CHECKLIST.md`

- [ ] Resend domain verify (DNS)
- [ ] Stripe Connect éles payout
- [ ] Foxpost live API (`FOXPOST_API_URL`)
- [ ] Packeta live widget kulcs
- [ ] Valós futár tracking

---

## Hasznos parancsok

```bash
npm run dev
npm run build
npm run db:check-patches
node scripts/grant-admin-role.mjs your@email.com
node scripts/run-seller-new-item-e2e.mjs   # follower notify E2E (env kell)
```

---

## Beszélgetés / kontextus

Cursor agent transcript (ha folytatod ugyanabban a threadben):  
`agent-transcripts/f1513964-8b24-4771-b69d-e6f6ba4bdd86.jsonl`

Otthon új chatben: olvasd ezt a fájlt + `TODO-TOMORROW.md` + ezt a handoff-ot.
