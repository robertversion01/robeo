# ROBEO vs Vinted (production) — Gap Analysis

Utolsó audit: Bundle v2 + vacation mode + ProductCard overlay után.

**Cél:** 1:1 Vinted UX, üzleti logika és edge-case parity.

---

## HIGH — Következő sprint (üzleti / trust kritikus)

| Terület | Vinted (éles) | ROBEO V1 | Teendő |
|--------|----------------|----------|--------|
| Ajánlat lejárat | ~24 óra, automatikus `expired` + UI countdown | Nincs `expires_at`, nincs cron | `offers.expires_at`, worker, chat badge, auto-reject |
| Kétlépcsős ajánlat | Vevő is counter-elhet eladó counter után | Csak eladó counter (`offerActions`) | Buyer counter flow + max rounds |
| Checkout feltételek | Explicit elfogadás (checkbox / slider) | Passzív `termsHint` szöveg | Kötelező checkbox + bundle checkout is |
| Packeta | Pontválasztó + díj | Statikus opció, nincs picker | Packeta widget / API parity Foxpost mintára |
| Vacation mode | Szekrény rejtve feedből | **Kész** (`vacation_mode` + feed filter) | SQL patch futtatás |
| Dispute / refund | Teljes ticket + pénzvisszatérítés | `DisputeDemoPanel` demo | Éles dispute state machine + admin |
| Stripe Connect éles | Kifizetés eladónak | Demo / fallback account | Connect onboarding checklist |

---

## HIGH — Trust & Safety

| Terület | Vinted | ROBEO | Teendő |
|--------|--------|-------|--------|
| Verified badge | ID / phone verify flow | `seller_verified` DB + PDP panel only | Admin/KYC UI + apply flow |
| Response time | Profil + inbox badge | `sellerResponseTime.ts` + `SellerTrustPanel` | Badge inbox listában; `SellerTrustBadges` bekötése |
| Profile bio | Szerkeszthető + publikus | `bio` csak típusban | `profiles.bio` + edit + `PublicSellerProfile` |
| Vacation | Toggle + feed hide | **Kész** | — |
| Report / block | Termék + user report | Report bar részben | Block user + moderáció queue |
| Buyer protection copy | Egységes escrow story | Van banner | PDP + checkout szöveg parity |

---

## MEDIUM — Closet & feed

| Terület | Vinted | ROBEO | Teendő |
|--------|--------|-------|--------|
| Card overlay | Méret + márka képen | **Kész** (gradient overlay) | — |
| Favorite count | Szív + szám a kártyán | Heart only; `favorite_count` oszlop unused | Aggregátum vagy count oszlop UI |
| Bump badge | „Bumped” / kiemelt vizuál | `featured` pill | Vinted „Bump” copy + hero slot |
| Reserved / sold overlay | Szürke „Eladva” | `status` filter | Sold overlay a grid-en |
| Size filter chips | Gyors M/L/XL | Browse filter van | Chip UX mint Vinted |
| Keresés URL sync | Shareable filter URL | Részben client | Teljes URL ↔ state sync |

---

## MEDIUM — Chat & offers

| Terület | Vinted | ROBEO | Teendő |
|--------|--------|-------|--------|
| Offer expiry UI | Timer a chatben | Hiányzik | Countdown komponens |
| System messages | Ár változás, elfogadás, szállítás | `message_type=system` alap | `SaleSystemMessageCard` bekötés |
| Chat offers panel | Ajánlatok a beszélgetésben | `ChatBuyerOffersPanel` import, **nem renderelt** | Render + accept flow |
| Auto message on edit | Termék módosítás → system msg | Nincs | Trigger upload/edit → chat |
| Max price drop | Ajánlat minimum % | Nincs validáció | `minOfferPercent` szabály |
| Bundle offer thread | Csomag ajánlat chatben | `BundleOfferModal` | Thread UX finomítás |

---

## MEDIUM — Checkout & cart

| Terület | Vinted | ROBEO | Teendő |
|--------|--------|-------|--------|
| Shipping toggle | Azonnali összeg újraszámolás | Van `ShippingSelector` | Bundle + single parity teszt |
| Foxpost | APT map | **Kész** picker | Live API tracking |
| Global cart | Kosár ikon, több eladó | Csak seller bundle localStorage | `/cart` route (later) |
| Bundle checkout | Egy fizetés N tétel | **Kész v2** | — |
| Wallet partial pay | Egyenleg + kártya | Wallet ledger kész | Checkout UI kombináció |
| Terms slider | Húzd az elfogadáshoz | Hiányzik | Slider/checkbox komponens |

---

## LOW — Polish & parity

| Terület | Vinted | ROBEO | Teendő |
|--------|--------|-------|--------|
| Heart animation | Micro-interaction | Hover color only | CSS pulse on toggle |
| Language / locale | HU teljes | i18n hu/en | Hiányzó kulcsok audit |
| Push categories | Granuláris | `userPreferences` | Vinted-szerű csatornák |
| Saved search badge | „Új” a feeden | `savedSearchMatcher` | Nav badge finomítás |
| Promote analytics | Seller dashboard | **Demo panel kész** | Valós analytics (later) |
| DAC7 / invoicing | Éles NAV | Demo | Éles NAV integráció |

---

## Ma implementálva (ez a commit)

- [x] `ProductCard` — méret + márka overlay a képen (Vinted grid)
- [x] `ProfileSettingsHub` — Szabadság üzemmód → `profiles.vacation_mode`
- [x] Fő feed + Fresh strip — vacation eladók kiszűrése
- [x] `supabase/patch-vacation-mode.sql`

---

## SQL patch sorrend (új környezetben)

1. `fix-everything-schema.sql`
2. `patch-wallet-schema.sql` + `patch-vinted-advanced.sql` + `patch-vinted-legal.sql`
3. `patch-bundle-v2-promote.sql`
4. **`patch-vacation-mode.sql`** ← új

Ellenőrzés: `npm run db:check-patches`
