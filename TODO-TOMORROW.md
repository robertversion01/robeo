# 📋 ROBEO 1.5 — Vinted Total Clone — Holnapi teendők

## 1. Húzd le a legfrissebb kódot a céges laptopon
```bash
git pull
```

## 2. Ellenőrző lista — elsőkörös tesztek

### 🔴 KRITIKUS (Ezt nézd meg először!)
- [ ] **Főoldal** — Megjelenik a terméklista? Egy Navbar?
- [ ] **Termékoldal** → **"Vásárlás" gomb** → Checkout oldal (Vinted-stílus!)
- [ ] **Checkout UI** — Látod a **Vevővédelmi díjat** (5%)? A **Szállítási mód választást** (Foxpost/Packeta/Házhoz)?
- [ ] **Végösszeg** helyes? (termék + 5% vevővédelem + szállítás)
- [ ] **Bejelentkezés/Regisztráció** — toast üzenetek működnek?

### 🟠 FONTOS
- [ ] **Termék feltöltés** — Tölts fel **több képet** (max 6)! Működik az átrendezés? Első kép a fő kép?
- [ ] **Profil oldal** — Látod a "Tag since" információt? Az avatar betűjele megjelenik?
- [ ] **Statisztikák** — Átlagos eladási ár (Ø Ft / eladás) megjelenik?
- [ ] **Ajánlat küldése** (termékoldalról) → Eladó értesítést kap?
- [ ] **Ajánlat elfogadása** (Profil / Beérkező ajánlatok) → Vevő kap egy rendszerüzenetet fizetési linkkel?
- [ ] **Ajánlatból fizetés** — `?offer=...` paraméterrel működik a checkout?

### 🟡 AJÁNLOTT
- [ ] **Regisztráció** → `toast.success()` jelenik meg?
- [ ] **Üzenetek mobil nézet** — Sidebar eltűnik chat-nézetben? "←" vissza gomb működik?
- [ ] **Kedvencek oldal** — ProductGrid használja a ProductCard-ot?
- [ ] **Kép lazy loading** — Ellenőrizd a Network tab-ban, hogy a képek `loading="lazy"` attribútummal töltődnek-e

## 3. Vercel deployment
- A push automatikusan elindítja a Vercel deploymentet
- **Éles URL:** `https://robeo.vercel.app`
- Várakozás a zöld pipára (~2-3 perc)
- Ha piros: nézd meg a Vercel Dashboard-ot

## 4. Ha valami elromlott
- Ellenőrizd a hibakonzolt (F12 → Console / Network tab)
- `.env.local` tartalma rendben van?
- `npm run build` lefut lokálisan?
- Ellenőrizd a Supabase tábla struktúrát: a `products` táblában van `images` (text[]) oszlop?

## 5. Push / e-mail értesítések (e60cf14+)

**Állapot (2026-05-21):** VAPID + Resend élesben konfigurálva. Health: `webPushConfigured` + `emailConfigured` = true.

### Gyors API ellenőrzés
```powershell
curl https://robeo.vercel.app/api/push/vapid-public-key
curl https://robeo.vercel.app/api/marketplace-health
node scripts/diagnose-notifications.mjs
node scripts/trigger-saved-search-notification.mjs   # E2E: cron + resetWorkerState (823161e+)
```

### E2E trigger script (823161e+)
- `node scripts/trigger-saved-search-notification.mjs` — CRON_SECRET + Supabase anon elég
- Várható reset után: `outboundQueued > 0` (push/email queue + flush)
- `notified` = in-app insert; ha 0 marad → ellenőrizd `app_notifications` tábla (Supabase SQL patch)

### UI E2E (telefon / Chrome)
- [ ] Profil → **Kézbesítés** → Push be (engedély + service worker)
- [ ] Profil → **Kézbesítés** → E-mail be
- [ ] Profil → **Értesítések** → Mentett keresések be
- [ ] Browse → mentett keresés **szűk szűrővel** (pl. egyedi szó)
- [ ] Cron trigger: `Authorization: Bearer $CRON_SECRET` → `/api/workers/saved-search-scan`
- [ ] `/notifications` — in-app sor megjelenik
- [ ] Resend dashboard → Sent (csak regisztrált cím, ha `onboarding@resend.dev`)
- [ ] Böngésző push notification

### Ha `notified: 0` a workerben
- Normális, ha minden találat már **seen** (`robeo_saved_search_worker_state` metadata)
- Új termék feltöltése vagy új mentett keresés szükséges
- Deep check: add `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`-hoz → `node scripts/diagnose-notifications.mjs`

### Következő gép
```bash
git pull origin main   # legyen >= 823161e
npm run build
node scripts/trigger-saved-search-notification.mjs
```

- ✅ **Vevővédelmi díj** (5%, min 200 Ft, max 5000 Ft)
- ✅ **PriceBreakdown** komponens (Vinted-stílusú összegzés)
- ✅ **ShippingSelector** (Foxpost/Packeta/Házhoz szállítási idővel)
- ✅ **Checkout** 2 hasábos Vinted-stílus (bal: termék + szállítás, jobb: összegzés + fizetés)
- ✅ **Multi-image upload** (max 6 kép, előnézet, átrendezés)
- ✅ **ReviewForm** (csillagos értékelés + komment)
- ✅ **Profil** — "Tag since", avatar betűjel, Ø eladási ár
- ✅ **Ajánlat elfogadás → automatikus fizetési link** a vevőnek
- ✅ **Státusz konzisztencia** (paid → completed)