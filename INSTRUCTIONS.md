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

### 🚀 Helyi fejlesztés
```bash
# Függőségek telepítése
npm install

# Fejlesztői szerver indítása
npm run dev

# Build készítése éles környezetre
npm run build
```

### 🔑 Környezeti változók
Készíts egy `.env.local` fájlt a projekt gyökerében:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 📋 Funkció állapot (v1.0)

✅ **Kész funkciók:**
- 🔐 Hitelesítés és fiókkezelés
- 📤 Termék feltöltés és kezelés
- 🖼️ Több kép feltöltés és rendezés
- 🔍 Keresés és kategória szűrés
- 💌 Élő üzenetküldés
- 🤝 Ajánlat és alku rendszer
- 💳 Online fizetés (Stripe Checkout)
- ❤️ Kedvencek rendszer
- ⭐ Felhasználói értékelések
- 🧾 Vevői nyugta generálás
- 📊 Profil statisztikák

🚧 **Tervezett funkciók:**
- 📧 Email értesítések
- 🔔 Push értesítések
- 📍 Helyalapú szűrés

---

## 📜 Licenc
Szerzői jog védett © 2026 ROBEO. Minden jog fenntartva.