# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: wallet E2E + Web Push E2E + seller trust + demo dispute

---

## [DONE] Legal & compliance (Demo mode)

- [x] Demo invoicing, ÁSZF/GDPR, cookie banner, NAV/DAC7 admin
- [x] SQL: `patch-vinted-legal.sql`

## [DONE] Production features (Vinted Advanced)

- [x] Foxpost labels, price-watch cron, wallet ledger
- [x] SQL: `patch-vinted-advanced.sql`

## [DONE] Admin & codebase hygiene

- [x] RBAC, moderáció, notification pipeline, E2E scripts

## [DONE] Értesítések & pipeline

- [x] Outbox retry/cleanup + `/api/workers/outbox-retry`
- [x] Szerver dedupe (`notificationDedupe.ts`)
- [x] Price-watch szinkron (`POST /api/price-watch/sync`)
- [x] **Web Push E2E** — `public/sw.js`, `PushDeliveryPanel`, `POST /api/push/test`
- [ ] Resend **domain verify** — *külső: DNS a Resend dashboardon*

## [DONE] Pénztárca & Stripe (kód)

- [x] Wallet release flow (confirm API + ledger + RPC)
- [x] `patch-wallet-schema.sql` — ellenőrizd: `npm run db:check-patches`
- [x] Wallet UI refresh (`wallet:updated` event)
- [x] E2E script: `npm run test:wallet-release`
- [x] Cashout UI hibák (connect, insufficient balance)
- [ ] Stripe Connect **éles** payout — *Stripe teszt/live kulcsok*

## [DONE] PDP & trust

- [x] `PriceHistorySparkline`
- [x] Valós válaszidő aggregátum (`sellerResponseTime.ts`)

## [DONE] Egyéb kód

- [x] Upload AI feature flag (`ollamaFeature.ts`, `UPLOAD_AI_ENABLED`)
- [x] `npm run db:check-patches` — `scripts/check-supabase-patches.mjs`
- [x] Demo dispute panel (`DisputeDemoPanel` — integráld orders/detail ha kell)
- [x] `as any` csökkentés — cashout route

## [MANUAL / KÜLSŐ] Szállítás

- [ ] Foxpost live API — `FOXPOST_API_URL` + `FOXPOST_API_KEY`
- [ ] Packeta / házhoz
- [ ] Valós tracking (nem szimuláció)

## [PARTIAL] Vinted features B

- [x] seller_new_item DB trigger — teszt: `node scripts/run-seller-new-item-e2e.mjs <sellerId>`
- [ ] seller_new_item **push/email** flush teszt követőnél
- [ ] Szerver oldali katalógus keresés + URL sync
- [ ] Bundle checkout v2
- [ ] Counter-offer thread UX finomítás (alap már van: OffersList + chat)
- [ ] Bump / promote analytics dashboard
- [ ] Dispute/refund **éles** flow (demo panel kész)

---

## Gyors parancsok

```bash
npm run db:check-patches      # mely SQL patch futott már
npm run test:wallet-release   # pending → available E2E
npm run test:notifications    # saved-search + outbox pipeline
node scripts/run-seller-new-item-e2e.mjs <seller-uuid>
npm run build && npm run dev
curl http://localhost:3000/api/marketplace-health
```

**Supabase:** már ellenőrizve — minden fő tábla megvan. Admin: `UPDATE profiles SET role='admin' WHERE email='...'`

**Éles:** https://robeo.vercel.app
