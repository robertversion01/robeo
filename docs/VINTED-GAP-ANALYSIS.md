# ROBEO vs Vinted (production) — Gap Analysis

Utolsó audit: wallet bundle + pickup oszlop rename + disputes éles + offer expiry után.

**Cél:** 1:1 Vinted UX, üzleti logika és edge-case parity.

---

## V1 lezárt (kód) — HIGH

| Terület | Vinted (éles) | ROBEO V1 | Státusz |
|--------|----------------|----------|---------|
| Ajánlat lejárat | ~24 óra, auto `expired` | `offer_expiry` cron + UI | KÉSZ |
| Kétlépcsős ajánlat | Vevő counter | `buyerSendCounterOffer` + chat panel | KÉSZ |
| Checkout feltételek | Explicit elfogadás | `CheckoutTermsCheckbox` (single + bundle) | KÉSZ |
| Packeta | Pontválasztó | `PacketaPointPicker` (dev: HU statikus, live: widget key) | KÉSZ (live key kell) |
| Vacation mode | Szekrény rejtve feedből | `vacation_mode` + feed filter | KÉSZ |
| Dispute / refund | Ticket + refund | `patch-disputes.sql` + UI/API + admin queue | KÉSZ |
| Bundle wallet | Egyenleg + kártya bundle-re | wallet-pay route + UI | KÉSZ |
| Pickup unified | Foxpost+Packeta közös oszlop | `pickup_point_*` + backward compat | KÉSZ |

---

## V1 lezárt (kód) — MEDIUM

| Terület | ROBEO V1 | Státusz |
|--------|-----------|---------|
| Card overlay (méret + márka) | gradient overlay | KÉSZ |
| Favorite count a kártyán | aggregátum | KÉSZ |
| Saved search delete | UI gomb | KÉSZ |
| URL ↔ filter state | debounced sync | KÉSZ |
| Listed products keresés | csak aktív | KÉSZ |
| Sidebar filter counts | live | KÉSZ |
| Profile bio | `profiles.bio` + edit + public | KÉSZ |
| Profile vacation | toggle + hide | KÉSZ |
| Public seller profile + trust badges | full panel | KÉSZ |
| Chat offers panel | render + accept | KÉSZ |
| SaleSystemMessageCard | bekötve | KÉSZ |
| Chat buyer confirm receipt | gomb + dispute banner | KÉSZ |
| Min offer % | validáció | KÉSZ |
| Bundle offer thread | `BundleOfferModal` | KÉSZ |
| Heart animation | CSS pulse | KÉSZ |
| Bump i18n | hu/en | KÉSZ |
| Follower notify | upload → push/email | KÉSZ |

---

## Kívül (manual / infra) — HIGH

| Terület | Mit kell |
|---------|----------|
| Stripe Connect éles | Onboarding flow, KYC, payout, webhook eseménytípusok élesben |
| Resend DNS | Domain verify (SPF / DKIM), `RESEND_FROM` saját domain |
| Foxpost live API | `FOXPOST_API_URL` éles endpoint, futár label, tracking webhook |
| Packeta live widget | `NEXT_PUBLIC_PACKETA_API_KEY` éles kulcs, dropoff API |
| Carrier tracking valós | Polling vagy webhook (Foxpost + Packeta) |

---

## Még nem nyitott Vinted feature (V2 candidate)

| Terület | Vinted | ROBEO | Megjegyzés |
|---------|--------|-------|------------|
| Global cart | Több eladó egy fizetés | csak seller bundle | `/cart` route, multi-seller split |
| ID / phone verify flow | KYC UI | `seller_verified` admin-only flag | KYC vendor (pl. Stripe Identity) |
| Report / block user | block UI + moderation queue | report bar részben | block + admin queue |
| Push categories (granuláris) | `userPreferences` | per-channel granularitás |
| Seller dashboard | analytics | demo panel | bevétel, top termék, top vevő |
| DAC7 / NAV számla | éles | demo invoice | NAV integráció |
| Promote analytics | éles | demo | real impressions/clicks |
| Auto message on edit | termék módosítás → system msg | nincs | upload/edit chat trigger |
| Terms slider | „húzd az elfogadáshoz” | checkbox | UX polish |

---

## SQL patch sorrend (új környezetben)

1. `fix-everything-schema.sql`
2. `patch-wallet-schema.sql` + `patch-vinted-advanced.sql` + `patch-vinted-legal.sql`
3. `patch-vinted-masterpiece.sql`
4. `patch-bundle-v2-promote.sql`
5. `patch-vacation-mode.sql`
6. `patch-profiles-admin-role.sql`
7. `patch-products-marketplace-columns.sql`
8. `patch-profile-bio.sql`
9. `patch-offer-expiry.sql`
10. `patch-disputes.sql`
11. `patch-pickup-points-rename.sql`

Ellenőrzés: `npm run db:check-patches`

---

## Watch / korlátok

- Wallet checkout: bundle parity KÉSZ; webhook-on a `wallet_amount_paid` és `payment_provider='mixed'` mező figyelésével a refund matek helyes
- Pickup oszlopok: új `pickup_point_*` + `pickup_provider`; régi `foxpost_terminal_*` deprecated, **mindkettőbe ír** a kód (DROP majd csak miután a teljes flotta migrálva van)
- Offer expiry: Hobby 1 cron slot → `saved-search-scan` worker végén fut (`expireStaleOffers`)
- Packeta DEV mód: statikus HU pontok; live widget `NEXT_PUBLIC_PACKETA_API_KEY` kell
- Foxpost mock label: `foxpostClient.ts` createShipment éles API nélkül fake tracking number-t generál
