# 📋 ROBEO 1.0 — Holnapi teendők

## 1. Húzd le a legfrissebb kódot a céges laptopon
```bash
git pull
```

## 2. Ellenőrző lista — elsőkörös tesztek

### 🔴 KRITIKUS (Ezt nézd meg először!)
- [ ] **Főoldal** — Megjelenik a terméklista? Csak **EGY** Navbar van?
- [ ] **Keresőmező** — Működik a főoldalon? (layout-ban kereső, nem a Navbar-ban)
- [ ] **Termékoldal** — Kattints egy termékre → "Vásárlás" gomb → eljut a fizetési oldalra?
- [ ] **Bejelentkezés** — Működik a login/regisztráció?

### 🟠 FONTOS
- [ ] **Üzenetek mobil nézet** — Nyisd meg a Messages oldalt mobilon: sidebar eltűnik chat-nézetben? "←" vissza gomb működik?
- [ ] **Kedvencek oldal** — Működik a kedvencek eltávolítása? (át lett írva ProductGrid-re)
- [ ] **Fizetés** — Checkout oldal betöltése termékoldalról (`?id=...`) és ajánlatból (`?offer=...`)

### 🟡 AJÁNLOTT
- [ ] **Regisztráció** — `alert()` helyett `toast.success()` jelenik meg?
- [ ] **Profil oldal** — A kártyák egységesek a főoldallal? (Vinted-stílus)
- [ ] **Termék feltöltés** — Működik a képfeltöltés és mentés?

## 3. Vercel deployment
- A push automatikusan elindítja a Vercel deploymentet
- **Éles URL:** `https://robeo.vercel.app` (vagy ahogy a Vercel projekt be van állítva)
- Várakozás a zöld pipára (~2-3 perc)
- Ha piros: nézd meg a Vercel Dashboard-ot a hibaüzenetért

## 4. Ha valami elromlott
- Ellenőrizd a hibakonzolt (F12 → Console / Network tab)
- `.env.local` tartalma rendben van?
- `npm run build` lefut lokálisan?