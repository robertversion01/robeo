# 🚀 ROBEO - Másodkézkeskedés Magyarországon

Biztonságos és egyszerű másodkézkeskedés platform. Vásárolj és adj el használt cikkeket gyorsan, megbízhatóan.

---

## ✅ Funkciók

- 🔐 Hitelesítés Supabase Auth-al
- 📦 Termék feltöltés és böngészés
- 💬 Valós idejű chat
- 💰 Ajánlattevő rendszer
- 💳 Fizetés integráció
- ⭐ Értékelési rendszer
- ❤️ Kedvencek kezelés
- 📊 Eladói dashboard
- 🔔 Valós idejű értesítések
- 📱 Teljesen reszponzív design

---

## 🛠️ Telepítés és futtatás

### Előfeltételek
- Node.js 22+
- Supabase fiók és projekt

### 1. Klónozd a repót
```bash
git clone https://github.com/yourusername/robeo.git
cd robeo
```

### 2. Telepítsd a függőségeket
```bash
npm install
```

### 3. Állítsd be a környezeti változókat
Másold a `.env.example` fájlt `.env.local` néven és töltsd ki a saját adataiddal:
```bash
cp .env.example .env.local
```

Szerkeszd a fájlt:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Futtasd a fejlesztői szervert
```bash
npm run dev
```

A projekt elindul a következő címen: **http://localhost:3000**

---

## 🚀 Deployment Vercel-re

1.  Menj a [vercel.com](https://vercel.com) oldalra
2.  Importáld a GitHub repót
3.  Add hozzá az Environment változókat (`.env.example` alapján)
4.  Kattints a Deploy gombra

✅ A projekt automatikusan felépül és indít.

---

## 🎨 Design
- Sötétlila alap: `#2e1065`
- Türkiz accent: `#2dd4bf`
- Glassmorphism stílus mindenhol
- Simát animációk és átmenetek
- Teljesen reszponzív, mobil és asztali környezetben tökéletes

---

## 🗄️ Adatbázis
A kanonikus SQL migráció a `supabase/migration.sql` fájlban van. Ezt futtasd le a Supabase SQL Editorban első indítás előtt.

---

## 📝 Fejlesztés

```bash
npm run dev      # Fejlesztői szerver indítása
npm run build    # Production build készítése
npm run start    # Production szervert indítása
npm run lint     # ESLint ellenőrzés
```

---

## 🔒 Biztonság
- Minden adatbázis lekérdezés RLS policy-k védi
- Kliens oldalon csak publikus adatok érhetők el
- Hitelesítés nélkül nincs hozzáférés privát funkciókhoz

---

Készült ❤️ a ROBEO csapattal