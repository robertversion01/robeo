# Vercel deploy — production `main` + push fallback

Ha a Vercel **látja** a repót, de **push nem indít deploymentet**, állítsd be az alábbiakat, majd használd a Deploy Hook fallbackot.

## 1. Production branch = `main` (kötelező ellenőrzés)

A production branch **csak a Vercel dashboardban** állítható (nincs a `vercel.json`-ban).

1. [vercel.com](https://vercel.com) → projekt **robeo**
2. **Settings → Git**
3. **Production Branch** → legyen **`main`** (ne `master`, ne preview branch)
4. **Automatically deploy pushes** → **Enabled** (Production)
5. **Connected Git Repository** → `robertversion01/robeo`

Ha a push továbbra sem indul:

- **Disconnect** → **Connect** újra ugyanarra a repóra (webhook újragenerálás)
- GitHub: [github.com/settings/installations](https://github.com/settings/installations) → **Vercel** → `robeo` → teljes repo hozzáférés

## 2. Deploy Hook (fallback — repóban beépítve)

### Létrehozás Vercelben

1. **Settings → Git → Deploy Hooks**
2. **Create Hook**
   - Name: `github-main`
   - Branch: **`main`**
3. Másold a kapott URL-t (pl. `https://api.vercel.com/v1/integrations/deploy/...`)

### GitHub Actions (automatikus minden `main` pushra)

1. GitHub repo → **Settings → Secrets and variables → Actions**
2. **New repository secret**
   - Name: `VERCEL_DEPLOY_HOOK_URL`
   - Value: a Deploy Hook URL (1. lépés)
3. Következő `git push origin main` → workflow **Trigger Vercel Deploy** → POST a hookra

Workflow fájl: `.github/workflows/vercel-deploy-hook.yml`

### Lokális / kézi trigger

`.env.local` (gitignore — ne commitold a hook URL-t):

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
```

```bash
node scripts/trigger-vercel-deploy.mjs
# vagy
npm run deploy:trigger
```

## 3. Webhook / auto-deploy — mit javíts a dashboardon

| Beállítás | Hol | Érték |
|-----------|-----|--------|
| Production Branch | Settings → Git | `main` |
| Auto deploy | Settings → Git | ON |
| Ignored Build Step | Settings → Git | **üres** (vagy töröld) |
| Root Directory | Settings → General | `.` (repo gyökér) |
| Vercel GitHub App | github.com/settings/installations | repo access OK |

A repóban **nincs** `ignoreCommand` — ha mégis skipel, a hiba a Vercel UI Ignored Build Step mezőjében van.

## 4. Build azonnali indítása (rövid lista)

| # | Módszer | Lépés |
|---|---------|--------|
| 1 | **Vercel UI** | Deployments → legutóbbi → **⋯ → Redeploy** |
| 2 | **Vercel UI** | Deployments → **Create Deployment** → Branch `main` → legújabb commit |
| 3 | **Deploy Hook curl** | `curl -X POST "$VERCEL_DEPLOY_HOOK_URL"` |
| 4 | **Lokál script** | `npm run deploy:trigger` (`.env.local`-ban a hook URL) |
| 5 | **GitHub Actions** | Actions → **Trigger Vercel Deploy** → **Run workflow** (secret kell) |
| 6 | **Új push** | `git push origin main` (hook secret + workflow után ez is triggerel) |
| 7 | **Vercel CLI** | `npx vercel login` → `npx vercel deploy --prod` |

### Siker ellenőrzés

```text
GET https://robeo.vercel.app/api/health/marketplace
```

- **200 + JSON** → új build él
- **404** → még régi deployment

GitHub: **Deployments** tabon új `vercel[bot]` sor a legújabb commit SHA-val.
