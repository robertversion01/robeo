# Handoff — irodai gép → otthoni gép

**Dátum:** 2026-05-21  
**Remote:** `https://github.com/robertversion01/robeo.git`  
**Branch:** `main`

## Első 3 parancs holnap reggel

```bash
cd robeo
git pull origin main
npm install && npm run build
```

Ha nincs `npm` a PATH-ban: telepíts [Node.js LTS](https://nodejs.org/), majd a fenti parancsok.

## `.env.local`

Másold át az irodai gépről (USB / jelszókezelő) — **nincs a gitben**.

## Supabase patch-ek (ha még nem futottak)

1. `supabase/patch-bundle-v2-promote.sql`
2. `supabase/patch-vacation-mode.sql`

Ellenőrzés: `npm run db:check-patches`

## Vercel

- Legújabb deploy: Vercel → Deployments → branch **`main`**
- Hobby: `vercel.json` csak 1 napi cron
- Manuális deploy: Create Deployment → **`main`** (ne csak rövid SHA)

## Hasznos scriptek

```bash
npm run dev
npm run db:check-patches
node scripts/grant-admin-role.mjs your@email.com
```
