# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: Vinted-paritás lezárás (block, reaccept, offer expiry, feed szűrők)

---

## [DONE] V1 marketplace parity (kód)

- [x] Packeta picker, buyer counter-offer, offer expiry cron (saved-search workerben)
- [x] Dispute éles — `patch-disputes.sql` ✓
- [x] User block — `patch-user-blocks.sql` + `/api/users/block` + messages szűrés
- [x] Regisztráció `/auth/complete` + `AccountSetupGuard` + `/legal/reaccept`
- [x] Wallet checkout `termsAccepted` szerver ellenőrzés
- [x] Wallet checkout UI (egyenleg / mixed Stripe)
- [x] `seller_new_item` push/email — upload → `/api/products/notify-followers`
- [x] SaleSystemMessageCard a chatben
- [x] Chat buyer confirm receipt + dispute banner
- [x] SellerTrustBadges, Bump, heart animation, URL sync
- [x] Mobil vendég tab bar + cookie banner tab bar felett
- [x] ImmersiveFilterSheet találatszám előnézet

---

## [MANUAL / KÜLSÖ] — nem kód

- [ ] Resend domain verify (DNS)
- [ ] Stripe Connect éles payout
- [ ] Foxpost live API (`FOXPOST_API_URL`)
- [ ] Packeta live widget (`NEXT_PUBLIC_PACKETA_API_KEY`)
- [ ] Valós futár tracking

---

## Gyors parancsok

```bash
npm run db:check-patches
npm run build && npm run dev
```

**SQL patch-ek (futtatva / ellenőrizd):** offer-expiry, profile-bio, disputes, user-blocks (`npm run db:check-patches`)

**Új patch otthon (futtatandó):** `supabase/patch-pickup-points-rename.sql`
— semleges `pickup_point_*` oszlopok (Foxpost + Packeta közös), backward compat

**Éles:** https://robeo.vercel.app
