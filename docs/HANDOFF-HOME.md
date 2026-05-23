# Handoff — céges gép → otthoni gép

**Dátum:** 2026-05-22  
**Remote:** `https://github.com/robertversion01/robeo.git`  
**Branch:** `main` (szinkronban `origin/main`-nel)  
**Utolsó commit:** mobil Vinted feed (sötét téma, dizájner chip, vevővédelem sor)

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
(mobil feed) feat: Vinted-style dark mobile home feed with designer chips and buyer protection pricing
efb0ca8 Add Vinted-parity registration, trust, and marketplace UX improvements.
c0055de Expand marketplace ÁSZF to Vinted-style structure with ROBEO-specific demo terms.
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

- Packeta pontok a **`foxpost_terminal_*`** oszlopokban vannak (néveltér eltérés)
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

- [ ] Resend domain verify (DNS) — email értesítések
- [ ] Stripe Connect éles payout
- [ ] Foxpost live API (`FOXPOST_API_URL`)
- [ ] Packeta live widget kulcs
- [ ] Valós futár tracking

Opcionális kód nice-to-have: wallet bundle checkoutban, pickup oszlopok átnevezése, `INSTRUCTIONS.md` / `VINTED-GAP-ANALYSIS.md` frissítése.

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
