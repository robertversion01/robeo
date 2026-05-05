# 📦 GitHub és Vercel Deployment Útmutató

Ez az útmutató lépésről lépésre bemutatja, hogyan töltsd fel a projektet GitHub-ra és hogyan deployold Vercel-re.

---

## 🐙 1. Lépés: GitHub Repository létrehozása

1.  Menj a [github.com](https://github.com) oldalra és jelentkezz be
2.  Kattints a jobb felső sarokban lévő `+` gombra és válaszd a `New repository` opciót
3.  Add meg a repository nevét: `robeo`
4.  Válaszd a `Private` opciót
5.  **NE** jelöld be a `Add a README file`, `Add .gitignore` és `Choose a license` opciókat
6.  Kattints a `Create repository` gombra

---

## 🛠️ 2. Lépés: Kód feltöltése GitHub-ra

Nyisd meg a terminált a projekt mappában és futtasd ezeket a parancsokat:

```bash
# Git inicializálása
git init

# Minden fájl hozzáadása
git add .

# Első commit létrehozása
git commit -m "Initial commit - ROBEO full project"

# Távoli repository hozzácsatolása
git remote add origin https://github.com/TEGYUSERNAME/robeo.git

# Kód feltöltése GitHub-ra
git branch -M main
git push -u origin main
```

✅ A kód most már a GitHub-on van!

---

## ☁️ 3. Lépés: Deployment Vercel-re

1.  Menj a [vercel.com](https://vercel.com) oldalra és jelentkezz be GitHub fiókoddal
2.  Kattints az `Add New Project` gombra
3.  Importáld az imént létrehozott `robeo` repository-t
4.  **Environment Variables** résznél add hozzá ezeket a változókat:

| Név | Érték |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key-here` |

5.  Kattints a `Deploy` gombra

⏳ Várj 1-2 percet amíg a projekt felépül.

---

## ✅ 4. Lépés: Éles projekt

Ha a deployment sikeres volt:
- A projekt elérhető lesz egy automatikusan generált címen: `https://robeo-xyz.vercel.app`
- Később saját domain-t is csatlakoztathatsz
- Minden új GitHub push automatikusan új deployment-et indít

---

## 🔄 Folyamatos fejlesztés

Később a kód módosításai után csak ezeket kell futtatnod:
```bash
git add .
git commit -m "Leírás a módosításról"
git push
```

✅ A Vercel automatikusan újratelepíti a projektet!