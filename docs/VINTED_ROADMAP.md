# Vinted-szerű roadmap (ROBEO)

Utolsó frissítés: marketplace round 2 (2026-05)

## Kész — korábbi körök

- Feed vs Search tab, immersive scroll
- Seller bundle cart (session), closet UI, bundle offer üzenet
- Price watch + in-app price_drop értesítés
- Saved search match badge (local scan)
- Trust & safety blokkok
- Seller trust panel (verified, reviews, response label)
- Discovery rails: márka, méret, állapot, rendezés
- Notification csatornák bővítve (szűrők)

## Kész — ebben a körben (round 2)

| Terület | Állapot | Fájlok / megjegyzés |
|--------|---------|---------------------|
| Saved search alerts háttér | ✅ | `savedSearchNotify.ts`, `useMarketplaceBackgroundWorkers`, `POST /api/workers/saved-search-scan` (CRON_SECRET + userId) |
| Follower new listing | ✅ DB trigger | `supabase/patch-marketplace-round2.sql`, `patch-vinted-masterpiece.sql` — `seller_new_item` |
| Price history | ✅ local + DB előkészítés | `priceHistory.ts`, `product_price_snapshots` tábla SQL |
| Árcsökkenés badge PDP | ✅ | `PriceHistoryBadge.tsx` |
| Multi-item bundle checkout | ✅ v1 | `CheckoutBundleContent`, stripe `productIds[]` + kedvezmény % |
| Push/email csatorna váz | ✅ | `notificationChannels.ts`, beállítások UI |
| Seller trust score | ✅ heurisztika | `sellerTrust.ts` `trustScore`, `SellerTrustPanel` |
| Discovery tuning | ✅ | `feedRanking` + `conditions` preferencia beállításokban |
| Bundle / closet UX | ✅ | `/profile/[id]/closet`, PDP `SellerMoreListings`, checkout CTA |
| Notifications center | ✅ | `notificationIcons.tsx`, szűrők: saved_search, bundle, seller_new_item |
| Mobile polish | ✅ részleges | sticky checkout bundle, safe-area inset closet/checkout |

## Kész — round 3 (autonóm sprint)

| Terület | Állapot |
|--------|---------|
| Vercel cron | ✅ `vercel.json` óránként + GET handler `CRON_SECRET` |
| Discovery rails | ✅ Dinamikus márka/méret + ár chip + feed-en is |
| Offer flow chat | ✅ `ChatOfferActions`, `ChatBuyerOffersPanel`, vevő elutasít |
| Upload AI | ✅ Ollama `llama3` — `uploadListingAi.ts` + wizard gomb |
| Immersive mobil | ✅ `ImmersiveFilterSheet` bottom sheet |
| Push/email queue | ✅ Outbox típus + routing stub bővítés |

## Következő kör — backend / integráció

1. **Vercel env** — `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` Production-on
2. **FCM Web Push** — `dispatchPushNotification` bekötése
3. **E-mail** — Resend/SMTP + digest worker
4. **Bundle tranzakció** — `transactions` több `product_id` / line items meta webhookban
5. **Valós response time** — üzenet válaszidő aggregátum `profiles`
6. **Admin seller_verified** — UI + Supabase flag

## Következő kör — nagyobb UX

- Offer counter-offer thread UI finomítás
- Bump / relist / promote analytics
- Wardrobe AI ajánló (Ollama lokális, opcionális)
- Teljes bundle webhook (több termék státusz lock)

## Backend patch futtatás

```sql
-- Supabase SQL Editor:
-- 1. supabase/patch-vinted-masterpiece.sql (ha még nem futott)
-- 2. supabase/patch-marketplace-round2.sql
```

## Környezeti változók

| Változó | Cél |
|---------|-----|
| `CRON_SECRET` | Háttér saved-search scan összes userre |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker API admin műveletek |
