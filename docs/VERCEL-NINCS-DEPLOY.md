# Vercel nem frissül — gyors javítás

Ha a GitHub-on látod a commitot (pl. `2ad1fa8`), de a **Vercel Deployments** listában nincs:

## 1. Ellenőrizd a GitHub commitot

https://github.com/robertversion01/robeo/commits/main

Ha itt megvan a commit → a kód rendben van, a **Vercel kapcsolat** a gond.

## 2. Vercel — manuális deploy (2 perc)

1. https://vercel.com → bejelentkezés
2. Nyisd meg a **robeo** projektet (ha több van, a helyes domaint keresd: `robeo.vercel.app`)
3. **Deployments** fül
4. Jobb felső: **Create Deployment**
5. **Branch:** `main`
6. **Commit:** válaszd a legfrissebbet (`2ad1fa8` vagy újabb)
7. **Deploy**

Ha **Create Deployment** nincs vagy más repo látszik:

- **Settings → Git → Connected Git Repository**
  - Legyen: `robertversion01/robeo`
  - **Production Branch:** `main`
  - **Automatically deploy pushes:** BE
- Ha rossz repo / nincs kapcsolat: **Disconnect** → **Connect** újra

## 3. Deploy Hook (ha a push soha nem indít buildet)

1. Vercel → **Settings → Git → Deploy Hooks → Create Hook**
   - Name: `github-main`
   - Branch: `main`
2. Másold az URL-t
3. GitHub → repo **Settings → Secrets → Actions** → `VERCEL_DEPLOY_HOOK_URL` = az URL
4. GitHub → **Actions → Trigger Vercel Deploy → Run workflow**

Vagy lokálisan `.env.local`:

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
```

```bash
node scripts/trigger-vercel-deploy.mjs
```

## 4. Siker teszt

```text
https://robeo.vercel.app/api/marketplace-health
```

200 + JSON = új build él.

## 5. Gyakori okok

| Tünet | Ok |
|--------|-----|
| Commit GitHubon van, Vercelen nincs | Git disconnect / rossz projekt / rossz branch |
| Build Error a listában | Build log — `docs/VERCEL_DEPLOY.md` |
| Régi UI él | Production nem a legújabb Ready deployment |
