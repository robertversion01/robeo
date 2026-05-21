# ROBEO — Development TODO (V1 Next.js monolith)

Utolsó frissítés: admin RBAC + moderáció + backend cleanup

---

## [DONE] Admin & codebase hygiene

- [x] **Role-based admin (RBAC)** — `profiles.role === 'admin'` vagy `user_metadata.role`; nincs hardcoded e-mail
  - `src/lib/adminAuth.ts`, `src/hooks/useIsAdmin.ts`
  - `/api/admin/reports`, `/api/admin/image-audit` — `assertAdminRequest` + service role
- [x] **Bejelentett termékek moderáció** — pending feed, PATCH törlés/elvetés, frissítés gomb, reporter info
  - `AdminReportedItems.tsx`, `PATCH /api/admin/reports`
- [x] **Legacy `/backend` .NET törlése** — kanonikus út: Next.js monolith
- [x] **Notification `message` + `body` insert** — `insertAppNotificationSafe` (`b881a4f`)
- [x] **E2E pipeline script** — `scripts/run-e2e-notification-pipeline.mjs`
- [x] **VAPID + Resend + CRON + Service Role** — lokál health zöld (ha `.env.local` teljes)

### Supabase (futtasd ha még nem)

```sql
-- SQL Editor:
-- 1. supabase/patch-profiles-admin-role.sql
-- 2. UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_ADMIN_EMAIL';
-- 3. supabase/patch-vinted-final.sql (reports tábla)
-- 4. supabase/fix-everything-schema.sql
```

---

## A) Incomplete code / fixes (következő prioritás)

### Értesítések
- [ ] Resend **domain verify** — sandbox csak regisztrált címre küld
- [ ] Web Push előfizetés E2E — Profil → Kézbesítés, `public/sw.js`
- [ ] Outbox retry / cleanup ha push/email fail
- [ ] Price-watch **szerver cron** (jelenleg kliens payload)
- [ ] Szerver oldali dedupe (ne csak `localStorage`)

### Szállítás
- [ ] Foxpost **valós címke API** (jelenleg HTML stub — `foxpostLabel.ts`)
- [ ] Packeta / házhoz carrier integráció
- [ ] Tranzakció státusz: szimuláció → valós tracking

### Pénztárca & Stripe
- [ ] Wallet release E2E (pending → available átvétel után)
- [ ] `patch-wallet-schema.sql` prod-on
- [ ] Stripe Connect cashout edge cases UI

### Egyéb
- [ ] `as any` csökkentés API route-okban
- [ ] Upload AI prod: `OLLAMA_URL` vagy feature flag

---

## B) Next logical Vinted features

- [ ] Szerver oldali katalógus keresés + URL sync finomhangolás
- [ ] Ár history grafikon PDP-n (`PriceHistoryBadge` + snapshots)
- [ ] Követés → `seller_new_item` push/email teszt
- [ ] Seller trust: valós válaszidő aggregátum
- [ ] Bundle checkout v2 — line items, orders UI
- [ ] Counter-offer thread UX
- [ ] Bump / promote analytics
- [ ] Dispute / refund buyer flow

---

## Gyors smoke (minden gépen)

```bash
git pull origin main
npm install
npm run build
npm run dev
curl http://localhost:3000/api/marketplace-health
node scripts/run-e2e-notification-pipeline.mjs
```

**Éles:** `https://robeo.vercel.app`
