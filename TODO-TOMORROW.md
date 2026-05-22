# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: Packeta picker + buyer counter + disputes éles + polish

Részletes gap lista: **`docs/VINTED-GAP-ANALYSIS.md`**

---

## [DONE] Marketplace UI benchmark (P0–P2 home)

- [x] Browse / PDP / trust / profile P0–P2 (commit `0b78816`)

## [DONE] Backlog folytatás

- [x] Checkout terms, favorite count, saved search delete, filter counts
- [x] Listed products search parity (`listedProducts.ts`)
- [x] Offer 24h expiry + chat offers panel + profile bio
- [x] **Packeta picker** — `PacketaPointPicker` + checkout/API
- [x] **Buyer counter-offer** — 2. kör chatben
- [x] **Dispute éles** — `disputes` tábla, API, admin panel, Stripe refund (`patch-disputes.sql`)
- [x] Offer expiry cron — `saved-search-scan` worker végén
- [x] SellerTrustBadges + Bump badge + heart animation + URL sync debounce

---

## [PARTIAL] Értesítések & pipeline

- [x] Outbox retry, Web Push E2E, price-watch sync
- [ ] Resend domain verify — *külső DNS*
- [ ] seller_new_item push/email flush E2E

## [PARTIAL] Pénztárca & Stripe

- [x] Wallet release E2E, cashout UI
- [ ] Stripe Connect **éles** payout

## [MANUAL / KÜLSŐ] Szállítás

- [ ] Foxpost live API — `FOXPOST_API_URL` + key
- [ ] Packeta live widget — `NEXT_PUBLIC_PACKETA_API_KEY`
- [ ] Valós tracking

---

## Gyors parancsok

```bash
npm run db:check-patches
npm run build && npm run dev
npm run test:wallet-release
```

**Új SQL (futtasd Supabase SQL Editorban):**

1. `patch-offer-expiry.sql` ✓
2. `patch-profile-bio.sql` ✓
3. **`patch-disputes.sql`** ← új

**Éles:** https://robeo.vercel.app
