# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: Vinted gap audit + vacation mode + ProductCard overlay

Részletes gap lista: **`docs/VINTED-GAP-ANALYSIS.md`**

---

## [DONE] Legal & compliance (Demo mode)

- [x] Demo invoicing, ÁSZF/GDPR, cookie banner, NAV/DAC7 admin
- [x] SQL: `patch-vinted-legal.sql`

## [DONE] Production features (Vinted Advanced)

- [x] Foxpost labels, price-watch cron, wallet ledger
- [x] SQL: `patch-vinted-advanced.sql`

## [DONE] Bundle v2 + Promote demo

- [x] Bundle checkout API, line items, Foxpost, orders/success UI
- [x] Promote analytics card + demo views/clicks
- [x] SQL: `patch-bundle-v2-promote.sql`

## [DONE] Vinted micro-parity (ma)

- [x] ProductCard — méret + márka overlay (Vinted grid)
- [x] Vacation mode toggle + feed filter
- [x] SQL: `patch-vacation-mode.sql`

## [DONE] Admin & codebase hygiene

- [x] RBAC, moderáció, notification pipeline, E2E scripts

## [HIGH] Vinted parity — következő

- [ ] **Offer 24h expiry** — `offers.expires_at`, cron, chat countdown
- [ ] **Checkout terms** — kötelező checkbox (single + bundle)
- [ ] **Packeta picker** — Foxpost mintára
- [ ] **ChatBuyerOffersPanel** — renderelés a messages oldalon
- [ ] **Buyer counter-offer** — második kör vevőtől
- [ ] **Profile bio** — `profiles.bio` + szerkesztés + publikus profil
- [ ] **Verified seller flow** — admin/KYC, nem csak DB flag
- [ ] **Favorite count on ProductCard** — aggregátum a grid-en
- [ ] **Dispute éles** — refund state machine (demo panel → production)

## [PARTIAL] Értesítések & pipeline

- [x] Outbox retry, Web Push E2E, price-watch sync
- [ ] Resend domain verify — *külső DNS*
- [ ] seller_new_item push/email flush E2E

## [PARTIAL] Pénztárca & Stripe

- [x] Wallet release E2E, cashout UI
- [ ] Stripe Connect **éles** payout

## [MANUAL / KÜLSŐ] Szállítás

- [ ] Foxpost live API — `FOXPOST_API_URL` + key
- [ ] Packeta live integration
- [ ] Valós tracking

## [LOW] Polish

- [ ] Heart animation on favorite toggle
- [ ] „Bump” badge copy (featured → Vinted wording)
- [ ] Keresés teljes URL sync
- [ ] `SellerTrustBadges` bekötése vagy törlése (dead code)

---

## Gyors parancsok

```bash
npm run db:check-patches
npm run build && npm run dev
npm run test:wallet-release
```

**Új SQL:** `patch-vacation-mode.sql` — Supabase SQL Editor

**Éles:** https://robeo.vercel.app
