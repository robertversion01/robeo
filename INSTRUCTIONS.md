# 🚀 ROBEO - Használati és fejlesztési útmutató

---

## 🎯 Mi az a ROBEO?

A ROBEO egy közösség alapú másodkézkeskedési platform, ahol stílusos ruhákat, cipőt és kiegészítőket tudsz vásárolni és eladni magyar nyelven.

Nincs közvetítő díj, nincs rejtett költség. Csak ti és a stílus.

---

## 👤 Felhasználói útmutató

### 🔹 1. Regisztráció és Belépés
1.  Kattints a jobb felső sarokban található "Belépés" gombra
2.  Add meg az e-mail címed és egy jelszót
3.  Erősítsd meg az e-mail címedet a beérkező leveleen
4.  Készen állsz a vásárlásra és eladásra!

### 🔹 2. Termék feltöltése
1.  Jelentkezz be
2.  Menj a "Feltöltés" oldalra
3.  Töltsd fel a termék fényképét
4.  Add meg a nevet, leírást, árat és kategóriát
5.  Kattints a "Termék feltöltése" gombra

### 🔹 3. Vásárlás és Alkudozás
1.  Böngássz a termékek között a főoldalon
2.  Használj keresőt és szűrőt a találkozás javításához
3.  Ha tetszik egy termék, kattints rá
4.  Küldj ajánlatot az "Ajánlat küldése" gombbal
5.  Várj míg az eladó válaszol
6.  Ha elfogadja az ajánlatod, rendezzetek a kiszállításról a chatben

### 🔹 4. Kedvencek
Kattints a szívecskére bármelyik terméknél, hogy elmentsd a kedvenceid közé. A mentett termékek a "Kedvencek" oldalon találhatók.

---

## 👨‍💻 Fejlesztői útmutató

### 🛠 Technikai stack
| Komponens | Verzió |
|---|---|
| Next.js | 16.2.4 |
| React | 19.2.4 |
| TypeScript | 5.x |
| Supabase | 2.x |
| Tailwind CSS | 4.x |
| shadcn/ui | Legújabb |
| Vercel | Éles környezet |

### 📂 Projekt struktúra
```
src/
├── app/                # Next.js App Router
├── components/
│   ├── layout/        # Globális komponensek (Navbar, Footer)
│   ├── product/       # Termékkel kapcsolatos komponensek
│   ├── profile/       # Profil komponensek
│   ├── review/        # Értékelések
│   └── ui/            # shadcn/ui komponensek
├── hooks/             # Custom React hookok
├── lib/               # Segédfüggvények és kliensek
└── types/             # Közös TypeScript interfészek
```

### Helyi fejlesztés
```bash
npm install
npm run dev
npm run build
npm run db:check-patches   # Supabase patch állapot
```

### Környezeti változók
Készíts egy `.env.local` fájlt — sablon: `.env.example`. Fő kulcsok:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRON_SECRET=long-random-string
NEXT_PUBLIC_OLLAMA_URL=http://127.0.0.1:11434
NEXT_PUBLIC_OLLAMA_CHAT_MODEL=llama3
```

Részletek: `.env.example` (Resend / SMTP / VAPID / Foxpost / Packeta opcionálisak).

### AI (lokális, ingyenes)

- Ollama (`localhost:11434`)
- Chat: `llama3`
- Embedding: `nomic-embed-text`

NVIDIA RTX 3060-ra optimalizált helyi fejlesztés. **Külső fizetős AI API tilos** (lásd cursor rule).

### Tesztfiókok

`docs/TEST_ACCOUNTS.md` — admin / seller / buyer szerepek sablonja. Admin jog: `node scripts/grant-admin-role.mjs your@email.com`.

---

## Funkció állapot (V1)

**Kész:**

- Auth, profil, bio, vacation mode, public seller profile, trust badges
- Termék: feltöltés (wizard), több kép, méret/márka overlay, sold/reserved overlay
- Browse/Search: kategória, szűrők, URL ↔ state sync, listed products parity, favorite count
- Ajánlat: küldés, eladói counter, **vevői counter**, **24h auto-expiry**, minimum % validáció
- Chat: ajánlatok panel, system messages, sale system card, dispute banner, buyer confirm receipt
- Checkout: Stripe egy- és **bundle**, **wallet (single + bundle)**, Foxpost picker, **Packeta picker**, kötelező terms checkbox
- Wallet: pending/available ledger, eladói credit, kifizetés (Stripe Connect)
- Disputes: buyer/seller flow, admin queue, refund
- Értesítések: in-app, push (VAPID), email (Resend / SMTP), saved search, price drop, seller_new_item (követő → új termék)
- Admin: kiemelés, seller_verified, disputes, reports, DAC7 demo
- Cron: Vercel Hobby 1 slot (`saved-search-scan` + offer expiry chain)
- Pickup pontok: új `pickup_point_*` oszlopok (Foxpost + Packeta közös)

**Kívül (manual / DNS / key):**

- Resend DNS verify (saját domain)
- Stripe Connect éles payout
- Foxpost live API (`FOXPOST_API_URL`)
- Packeta live widget (`NEXT_PUBLIC_PACKETA_API_KEY`)
- Valós futár tracking

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

## Licenc

Szerzői jog védett © 2026 ROBEO. Minden jog fenntartva.