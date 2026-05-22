# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: offer expiry + chat offers panel + profile bio + search filter fix

Részletes gap lista: **`docs/VINTED-GAP-ANALYSIS.md`**

---

## [DONE] Marketplace UI benchmark (P0–P2 home)

- [x] Browse / PDP / trust / profile P0–P2 (commit `0b78816`)

## [DONE] Backlog folytatás (office session)

- [x] **P1-4 Verified seller admin** — `/api/admin/seller-verified` + AdminHub toggle
- [x] **P2 FilterChipDropdown** — aktív chip: `Márka: Nike` formátum
- [x] **P0 Szerver lapozás** — `useProducts` `.range()` + load more + vacation szűrés
- [x] **Allegro desktop sidebar** — `CatalogFilterSidebar` + DB count
- [x] **Hacoo discovery chip polish** — aktív chip, darabszám, Felfedezés kártya
- [x] **Browse scroll stabil** — immersive chrome + padding fix
- [x] **Vinted kategória-fa** — department + alkategória + szín szűrő
- [x] **Globális discovery trending** — `fetchGlobalDiscoveryChips`
- [x] **Sold overlay** — ProductCard grid (profil / sold státusz)
- [x] **Checkout terms checkbox** — single + bundle + API validáció
- [x] **Favorite count** — ProductCard batch count + toggle sync
- [x] **Mentett keresés törlés** — confirm + metadata + sidecar cleanup
- [x] **Keresés aktív katalógus** — `listedProducts.ts` typeahead + grid parity
- [x] **Offer 24h expiry** — `expires_at`, worker, countdown UI (`patch-offer-expiry.sql`)
- [x] **ChatBuyerOffersPanel** — bekötve `/messages` chat flow-ba
- [x] **Profile bio** — settings + publikus profil (`patch-profile-bio.sql`)

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

## [DONE] Vinted micro-parity

- [x] ProductCard — méret + márka overlay
- [x] Vacation mode toggle + feed filter
- [x] SQL: `patch-vacation-mode.sql`

## [DONE] Admin & codebase hygiene

- [x] RBAC, moderáció, notification pipeline, E2E scripts

## [HIGH] Vinted parity — következő

- [ ] **Packeta picker** — Foxpost mintára
- [ ] **Buyer counter-offer** — második kör vevőtől (vevő counter ajánlat küldése)
- [ ] **Dispute éles** — refund state machine (demo panel → production)

## [PARTIAL] Értesítések & pipeline

- [x] Outbox retry, Web Push E2E, price-watch sync
- [ ] Resend domain verify — *külső DNS*
- [ ] seller_new_item push/email flush E2E
- [ ] Offer expiry cron Vercel — `/api/workers/offer-expiry` (Hobby: 1 cron slot)

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

**Új SQL (futtasd Supabase SQL Editorban):**

1. `patch-vacation-mode.sql`
2. `patch-offer-expiry.sql`
3. `patch-profile-bio.sql`

**Éles:** https://robeo.vercel.app
