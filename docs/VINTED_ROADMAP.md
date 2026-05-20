# Vinted-szerű roadmap (ROBEO)

## Kész (frontend / meglévő backend)

- Feed vs Search tab, immersive scroll
- Seller bundle cart (session), closet UI, bundle offer üzenet
- Price watch + in-app price_drop értesítés
- Saved search match badge (local scan)
- Trust & safety blokkok
- Seller trust panel (verified metadata, reviews, response label)
- Discovery rails: márka, méret, állapot, rendezés
- Notification csatornák bővítve

## Következő kör — backend szükséges

1. **Multi-item checkout** — `checkout` API több `productId` + bundle discount sor
2. **Saved search worker** — cron / edge function új termék → `app_notifications`
3. **Follower new listing** — `products` INSERT trigger → followers notify
4. **Price history table** — `product_price_history` + reliable alerts
5. **Seller verification** — admin flag `profiles.seller_verified` (már olvasható)

## Következő kör — nagyobb UX

- Wardrobe / closet page per seller
- Offer counter-offer thread UI
- Bump / relist / promote analytics
- In-app push (FCM) + email digest
