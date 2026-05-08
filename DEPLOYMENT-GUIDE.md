# 🚀 ROBEO Deployment Útmutató

Teljes lépésről lépésre útmutató a ROBEO éles indításához GitHub és Vercel segítségével.

---

## 🐙 1. Lépés: GitHub Repository létrehozása

1.  Menj a [github.com](https://github.com) oldalra és jelentkezz be
2.  Kattints a jobb felső sarokban lévő `+` gombra
3.  Válaszd a `New repository` opciót
4.  **Repository name:** `robeo`
5.  **Privacy:** `Private` ✅
6.  **NE jelöld be** a `Add a README file`, `Add .gitignore` és `Choose a license` opciókat
7.  Kattints a `Create repository` gombra

---

## 🛠️ 2. Lépés: Kód feltöltése GitHub-ra

Nyisd meg a terminált a projekt mappában és futtasd ezeket a parancsokat sorban:

```bash
# Git inicializálása
git init

# Minden fájl hozzáadása
git add .

# Első commit létrehozása
git commit -m "Initial commit - ROBEO full project"

# Távoli repository hozzácsatolása
# CSAK A SZERKESZD ÁT A TEGYUSERNAME RÉSZT A SAJÁT FELHASZNÁLÓNEVEDRE!
git remote add origin https://github.com/TEGYUSERNAME/robeo.git

# Ágat átnevezése main-re
git branch -M main

# Kód feltöltése GitHub-ra
git push -u origin main
```

✅ A kód most már a GitHub-on van!

---

## ☁️ 3. Lépés: Deployment Vercel-re

1.  Menj a [vercel.com](https://vercel.com) oldalra
2.  Jelentkezz be a GitHub fiókoddal
3.  Kattints az `Add New Project` gombra
4.  Importáld az imént létrehozott `robeo` repository-t
5.  **Configure Project** oldalon:
    - **Project Name:** `robeo`
    - **Framework Preset:** `Next.js` (automatikusan felismeri)
    - **Root Directory:** `./`

---

## 🔑 4. Lépés: Environment Variables hozzáadása

Ugyanazon az oldalon görgess le az **Environment Variables** részhez:

| Név | Érték |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key-here` |
| `STRIPE_SECRET_KEY` | `sk_live_or_test_xxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` |
| `NEXT_PUBLIC_BASE_URL` | `https://your-deployment-domain.vercel.app` |

💡 A Supabase értékeket a Supabase beállításokban találod, a Stripe kulcsokat pedig a Stripe Dashboardban.

---

## 🚀 5. Lépés: Indítás

Kattints a `Deploy` gombra!

⏳ Várj 1-2 percet amíg a projekt felépül.

✅ Ha minden sikeres volt, látni fogod a sikeres deployment üzenetet és a projekt elérési címét.

---

## 🌐 6. Lépés: Saját Domain csatlakoztatása (később)

1.  Menj a projekt Dashboardra Vercel-en
2.  Kattints a `Settings` fülre
3.  Válaszd a `Domains` opciót
4.  Add meg a saját domain címedet
5.  Kövesd a Vercel által mutatott DNS beállításokat

---

## ✅ Ellenőrző lista

- [ ] GitHub repository létrehozva
- [ ] Kód sikeresen feltöltve
- [ ] Vercel projekt létrehozva
- [ ] Environment változók hozzáadva
- [ ] Sikeres deployment
- [ ] Oldal betöltődik és működik
- [ ] Regisztráció, belépés tesztelve
- [ ] Termék feltöltés tesztelve
- [ ] Chat és ajánlattevés tesztelve

---

### 🎉 Gratulálok! A ROBEO most már élesben fut!