# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: backlog folytatás — verified seller admin, szerver lapozás, filter chip polish

Részletes gap lista: **`docs/VINTED-GAP-ANALYSIS.md`**

---

## [DONE] Marketplace UI benchmark (P0–P2 home)

- [x] Browse / PDP / trust / profile P0–P2 (commit `0b78816`)

## [DONE] Backlog folytatás (office session)

- [x] **P1-4 Verified seller admin** — `/api/admin/seller-verified` (role auth) + AdminHub toggle
- [x] **P2 FilterChipDropdown** — aktív chip: `Márka: Nike` formátum
- [x] **P0 Szerver lapozás** — `useProducts` `.range()` + load more + vacation szűrés vissza
- [x] **Allegro desktop sidebar** — `/browse` lg+ bal szűrőpanel (`CatalogFilterSidebar`)
- [x] **Hacoo discovery chip polish** — aktív chip, darabszám, Felfedezés kártya desktopon
- [x] **Browse scroll stabil** — nincs layout shift alsó floating szűrő / tab bar / chrome collapse
- [x] **Vinted kategória-fa** — department + alkategória + szín szűrő (mobil + desktop)
- [x] **Globális discovery trending** — `fetchGlobalDiscoveryChips` a /browse-on
- [x] **Sold overlay** — ProductCard grid (ha sold státusz megjelenik)

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
- [x] **Verified seller flow** — admin API + hub toggle (`seller_verified`)
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
