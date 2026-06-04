# ROBEO v2 — Vite preview (skeleton)

A V2 frontend egy különálló Vite + React 19 + Tailwind v4 SPA, ami a
Marketplace.API (.NET, port 5055) backendre épülne. Jelenleg **csak preview**:
a V1 Next.js app a fő termék, ezt csak `NEXT_PUBLIC_ENABLE_V2_PREVIEW=true`
mellett lehet bekapcsolni.

## Indítás

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

A backend (`backend/Marketplace.API`) futtatása — lásd `backend/run_v2.ps1`
vagy hasonló segéd. A `/api/*` hívások a Vite proxy-n keresztül mennek a
backendre (`http://localhost:5055`).

Felülírható: `VITE_API_PROXY_TARGET` környezeti változó.

## Struktúra

```
frontend/
  index.html
  src/
    main.tsx          # belépési pont (React 19 root, BrowserRouter)
    App.tsx           # útvonalak
    index.css         # Tailwind v4 import
    pages/
      HomePage.tsx    # preview kezdő
      BrowsePage.tsx  # próba GET /api/products
```

## Korlátok

- Auth még nincs — a v1 Supabase session-t nem osztja a v2-vel
- Stripe checkout nincs implementálva
- Csak demonstratív UI; az éles forgalmat továbbra is a V1 (Next.js) szolgálja ki
