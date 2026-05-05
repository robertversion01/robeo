# 🚀 ROBEO – Teljes Indítási Ellenőrző Lista (v2.1)

Ez a lista tartalmazza az összes lépést, amit el kell végezned mielőtt élesben indítod a ROBEO-t.

---

## 🔧 1. Supabase Production Beállítások
- [ ] Futtasd le az összes SQL migrációt (reviews, users view, products status stb.)
- [ ] Hozz létre `product-images` bucket-et a Storage-ban
- [ ] Állítsd be a Storage policy-kat (olvasás publikus, feltöltés authenticated)
- [ ] Ellenőrizd az RLS szabályokat minden kritikus táblán (products, offers, messages, favorites, reviews)

---

## 🐙 2. Git & Repository
- [ ] `git init` + `.gitignore` létrehozása
- [ ] Privát GitHub repository létrehozása (`robeo`)
- [ ] Kód feltöltése main branch-re

---

## ☁️ 3. Vercel Deployment
- [ ] Repository importálása Vercel-re
- [ ] Environment Variables hozzáadása (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Deploy és első ellenőrzés (előzetes preview link)

---

## ✅ 4. Utolsó Ellenőrzések éles környezetben
- [ ] Chat: valódi nevek + avatar működik
- [ ] Ajánlat modal és teljes folyamat (ajánlat → elfogadás → fizetés → nyugta)
- [ ] Toast értesítések (kedvelés + új üzenet)
- [ ] Mobil responsiveness teljes tesztelése
- [ ] Termék státusz (`sold` esetén elrejtés a főoldalon)

---

## 🚀 5. Indítás utáni teendők
- Első 20-30 termék feltöltése (ismerősökkel)
- Beta tesztelés
- Marketing indítás