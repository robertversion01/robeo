# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: disputes patch + wallet checkout + follower notify E2E

---

## [DONE] V1 marketplace parity (kód)

- [x] Packeta picker, buyer counter-offer, offer expiry cron
- [x] Dispute éles — `patch-disputes.sql` ✓
- [x] Wallet checkout UI (egyenleg / mixed Stripe)
- [x] `seller_new_item` push/email — upload → `/api/products/notify-followers`
- [x] SaleSystemMessageCard a chatben
- [x] Chat buyer confirm receipt + dispute banner
- [x] SellerTrustBadges, Bump, heart animation, URL sync

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

**SQL patch-ek (futtatva):** offer-expiry, profile-bio, disputes ✓

**Éles:** https://robeo.vercel.app
