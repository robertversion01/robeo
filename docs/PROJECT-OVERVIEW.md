# Robeo projekt — Komplett technikai összefoglaló (V1 + V2)

> **Cél:** Ezt a dokumentumot úgy fogalmaztam, hogy egy frissen érkező AI / fejlesztő minden lényegi tudnivalót megkapjon a kódba nyúlás előtt.

---

## 1. Projekt áttekintés

**Robeo** egy magyar használtcikk marketplace (Vinted-klón / -paritás), két szálon fut a fejlesztés:

| Track | Cél | Állapot | Helye |
|---|---|---|---|
| **V1** | Production-ready Next.js monolith | Kód kész, deployolva | repo gyökér + `src/` |
| **V2** | Next-gen Vite SPA frontend (preview) | Skeleton, "coming soon" | `frontend/` mappa |

**Élesben:** https://robeo.vercel.app

**Üzleti modell:** P2P használtcikk értékesítés, eladói díjazás Stripe Connect-en, vevői védelem (Buyer Protection), pénztárca (wallet), bundle akció (egy eladótól több termék kedvezménnyel), Foxpost / Packeta automata szállítás, dispute kezelés.

---

## 2. KRITIKUS KONVENCIÓK — ezt OLVASSA ELŐSZÖR minden AI

### 2.1. Next.js verzió figyelmeztetés

A repo gyökerében az `AGENTS.md` és `CLAUDE.md` ezt mondja:

> **„This is NOT the Next.js you know"** — Breaking changes vannak a training adatokhoz képest. API-k, konvenciók, fájlstruktúra eltérhet. Kód írás előtt **MINDIG** olvasd a `node_modules/next/dist/docs/` releváns guide-ját, és vedd komolyan a deprecation noticeokat.

### 2.2. AI / külső szolgáltatás szabály (user rule)

- **CSAK** helyi, ingyenes fejlesztői környezet.
- AI funkciókhoz (chat, embedding) **kizárólag Ollama** (`localhost:11434`).
- Modellek: `llama3` (chat), `nomic-embed-text` (embedding).
- **TILOS** OpenAI, Anthropic vagy bármilyen fizetős külső API.
- Hardware feltételezés: NVIDIA RTX 3060 → erre kell optimalizálni.
- Külső felhős pluginek tilosak.

### 2.3. Nyelv

A felhasználói interakció és a kommentek nagyrészt magyarul, a kód angolul. UI string-eket az `src/i18n/locales/hu.json` és `en.json` tartalmazza.

---

## 3. V1 — Next.js monolith mélymerülés

### 3.1. Tech stack

| Komponens | Verzió / megoldás |
|---|---|
| Framework | Next.js App Router (módosított, lásd 2.1.) |
| Nyelv | TypeScript (strict) |
| DB / Auth | Supabase (Postgres, RLS, Realtime, Storage) |
| Fizetés | Stripe Connect (payout eladóknak) + saját wallet |
| Email | Resend |
| Push | Web Push API (saját) |
| Szállítás | Foxpost + Packeta automata pickup |
| Stílus | Tailwind CSS |
| AI | Ollama lokális (`llama3` + `nomic-embed-text`) |
| Cron | Saved-search worker (`scripts/saved-search-worker.mjs`) — offer expiry is benne |
| Deploy | Vercel |

### 3.2. Mappastruktúra (lényeg)

```
robeo/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # Backend API routes
│   │   │   ├── checkout/wallet-pay/  # Pénztárca + bundle fizetés
│   │   │   ├── stripe/checkout/      # Stripe Connect checkout
│   │   │   ├── transactions/foxpost-label/
│   │   │   ├── products/notify-followers/
│   │   │   ├── users/block/
│   │   │   └── ...
│   │   ├── checkout/                 # Pénztár UI (CheckoutBundleContent.tsx is itt)
│   │   ├── products/[id]/            # Termékoldal (layout.tsx-ben JSON-LD)
│   │   ├── profile/[id]/layout.tsx   # OG meta seller profilhoz
│   │   ├── auth/complete/            # Regisztráció finalizálás
│   │   ├── legal/reaccept/           # ÁSZF újrafogadás
│   │   ├── sitemap.ts                # Dinamikus sitemap.xml
│   │   └── robots.ts                 # robots.txt
│   ├── components/
│   │   ├── messages/                 # Chat (ChatTransactionPanel, SaleSystemMessageCard)
│   │   ├── product/                  # ProductImage, SellerMoreListings, SimilarProductsRail, SellerClosetBundle
│   │   ├── seller/                   # SellerInsightsPanel (új) + SellerTrustBadges
│   │   ├── orders/                   # OrderHistoryPanel, TransactionList
│   │   └── home/                     # FreshOffersStrip, VintedHero
│   ├── lib/                          # Üzleti logika
│   │   ├── checkoutResolve.ts        # KRITIKUS: single + bundle checkout resolver
│   │   ├── pickupPoint.ts            # Foxpost + Packeta közös pickup pont kezelés
│   │   ├── sellerInsights.ts         # Eladói statisztikák
│   │   ├── seo.ts                    # buildPageMetadata helper
│   │   ├── stripeConnect.ts          # Stripe Connect helperek
│   │   └── supabase.ts               # Supabase client
│   ├── hooks/                        # useProducts.ts (React 19 hooks szabályoknak megfelelően)
│   └── i18n/locales/                 # hu.json, en.json
├── supabase/                         # SQL patch-ek (sorrendben futtatandók!)
│   ├── patch-vinted-masterpiece.sql  # Master patch: RLS, Realtime, kulcs táblák
│   ├── patch-disputes.sql
│   ├── patch-user-blocks.sql
│   ├── patch-offer-expiry.sql
│   ├── patch-profile-bio.sql
│   ├── patch-pickup-points-rename.sql # ÚJ: generikus pickup_point_* oszlopok
│   └── ...
├── scripts/
│   ├── check-supabase-patches.mjs    # Ellenőrzi, mely patch-ek vannak felrakva
│   ├── saved-search-worker.mjs       # Cron: offer expiry + saved search notif
│   └── grant-admin-role.mjs
├── frontend/                         # V2 Vite SPA (külön projekt!)
├── docs/
│   ├── VINTED-GAP-ANALYSIS.md        # Feature paritás tracker
│   └── INFRA-CHECKLIST.md            # Külső szolgáltatások setup guide
├── INSTRUCTIONS.md                   # Master setup + dev guide
├── TODO-TOMORROW.md                  # Élő TODO
├── HANDOFF-HOME.md                   # Otthoni gép handoff
├── AGENTS.md / CLAUDE.md             # AI agent szabályok (lásd 2.1.)
└── package.json
```

### 3.3. V1 feature lista (mind kész és pusholva)

#### Marketplace alap

- Termék listázás, kategória / méret / márka / állapot szűrők
- ImmersiveFilterSheet — szűrés közben élő találatszám előnézet
- Termékoldal (galéria, leírás, eladó info, hasonló termékek rail)
- SimilarProductsRail, FreshOffersStrip, SellerMoreListings, SellerClosetBundle
- Lazy load minden képnél (`loading="lazy"`, `decoding="async"`)
- Heart animáció kedvenceken
- URL sync (szűrők, lapozás share-elhető)

#### Auth / profil

- Supabase auth (email + Google OAuth)
- `/auth/complete` + `AccountSetupGuard` — felhasználó nem mehet checkout-ra, amíg nincs kész a profil
- `/legal/reaccept` — ÁSZF változáskor újraelfogadás kikényszerítve
- Profile bio (`patch-profile-bio.sql`)
- Seller trust badges (regisztráció óta eltelt idő, eladások száma, válaszidő)
- User blocking (`patch-user-blocks.sql` + `/api/users/block` + messages szűrés)

#### Fizetés

- Stripe Connect — eladói payout
- Pénztárca (wallet) — egyenleg checkoutnál használható
- **Wallet bundle checkout** — bundle vásárlás pénztárcából is mehet (új)
- Mixed payment — wallet + Stripe kombináció ha nem elég az egyenleg
- `termsAccepted` szerver oldali ellenőrzés wallet checkoutnál

#### Offer / chat

- Buyer counter-offer (visszaajánlás)
- Offer expiry cron (`saved-search-worker.mjs`-ben)
- Realtime chat (Supabase Realtime)
- SaleSystemMessageCard — vásárlás után rendszerüzenet a chatben
- Buyer confirm receipt + dispute banner

#### Szállítás

- Foxpost automata picker
- Packeta widget picker
- **Pickup pont oszlopok egységesítése** — `pickup_point_id`, `pickup_point_name`, `pickup_point_address`, `pickup_provider` (új generikus oszlopok, backward compat `foxpost_terminal_*`-gal)
- `resolvePickupPoint()` helper a `src/lib/pickupPoint.ts`-ben — közös olvasás mindkét forrásból
- Foxpost label nyomtatás

#### Dispute

- Dispute táblák (`patch-disputes.sql`)
- Vevői dispute indítás banner
- Admin felület disputek kezelésére

#### Értesítés

- Web Push (új termék, üzenet, ajánlat)
- Email (Resend) — sale, dispute, jelszó reset
- `seller_new_item` push/email — upload → `/api/products/notify-followers`

#### Eladói dashboard (új)

- `SellerInsightsPanel` — bevétel, eladás, top termékek
- `fetchSellerInsights` — havi trendek, gross/net revenue, average sale price
- Beépítve a `src/app/profile/page.tsx` shop tab-ba

#### SEO / Performance

- Dinamikus `sitemap.xml` (`src/app/sitemap.ts`)
- `robots.txt` (`src/app/robots.ts`) — privát útvonalak tiltva
- Open Graph meta termékoldalon és seller profilon
- JSON-LD Product structured data termékoldalon
- `buildPageMetadata` helper (`src/lib/seo.ts`)
- Lazy load + async decode minden képnél

#### Mobil UX

- Vendég tab bar mobilon
- Cookie banner a tab bar felett

### 3.4. Money flow architektúra (KRITIKUS)

```
Vevő → Checkout UI
  ├─ Single termék vagy Bundle?
  │
  ├─ Wallet használat? (új checkbox bundle-nél is)
  │   ├─ Igen + elég egyenleg → /api/checkout/wallet-pay
  │   │   └─ debit_wallet_available SQL funkció (atomic)
  │   │   └─ buildBundleTransactionInsertRow (bundle esetén)
  │   │   └─ insertTransactionLineItems
  │   │
  │   └─ Igen + nem elég → mixed: wallet részleges + Stripe a maradékra
  │
  └─ Csak Stripe → /api/stripe/checkout
      └─ Stripe Connect destination charge → eladó payout

Webhook:
  Stripe → /api/stripe/webhook → tranzakció státusz update + push/email

Bundle resolve:
  src/lib/checkoutResolve.ts → resolveBundleCheckout()
    - Egy eladó validáció
    - Termékek elérhetőség check
    - bundleDiscountPercent alkalmazás
    - Totals kiszámítás (subtotal, discount, shipping, buyer protection, total)
```

### 3.5. Adatbázis — SQL patch sorrend

A `supabase/` mappa patch-jeit **ebben a sorrendben** kell futtatni a Supabase SQL Editorban friss projektre:

1. Base schema (init)
2. `patch-vinted-masterpiece.sql` — **MASTER**: RLS, Realtime, kulcs táblák (transactions, wallets, products, profiles), `debit_wallet_available` function
3. `patch-disputes.sql`
4. `patch-user-blocks.sql`
5. `patch-offer-expiry.sql`
6. `patch-profile-bio.sql`
7. `patch-pickup-points-rename.sql` — **defenzív**: `IF EXISTS` blokkok, többször is futtatható

**Ellenőrzés:** `npm run db:check-patches` lefuttatja a `scripts/check-supabase-patches.mjs`-t, ami az alábbi oszlopokat / funkciókat keresi:

- `transactions.pickup_point_id`, `transactions.pickup_provider`
- `transactions.foxpost_terminal_id`
- `debit_wallet_available` function
- Dispute / blocks táblák
- Stb.

### 3.6. API routes (lényeg)

| Route | Cél | Auth |
|---|---|---|
| `POST /api/checkout/wallet-pay` | Wallet (és wallet+Stripe) fizetés. Body: `{ offerId?, productIds?, bundleDiscountPercent?, termsAccepted, ... }` | Bejelentkezett |
| `POST /api/stripe/checkout` | Stripe Connect checkout session indítás | Bejelentkezett |
| `POST /api/stripe/webhook` | Stripe esemény fogadás (signature ellenőrzés) | Public + signature |
| `POST /api/transactions/foxpost-label` | Foxpost csomagcímke generálás (eladó tölti le) | Eladó |
| `POST /api/products/notify-followers` | Új termék feltöltés → követőknek push/email | Eladó |
| `POST /api/users/block` | User blokkolás | Bejelentkezett |
| `GET /api/sellers/[id]/insights` | Eladói statisztikák | Owner |

### 3.7. Környezeti változók (`.env.local`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # FIGYELEM: csak szerver oldalon!

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Foxpost
FOXPOST_API_URL=                   # Live key INFRA-CHECKLIST szerint
FOXPOST_API_KEY=

# Packeta
NEXT_PUBLIC_PACKETA_API_KEY=

# Ollama (lokális AI)
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text

# App
NEXT_PUBLIC_APP_URL=
```

A teljes lista és setup lépés: `docs/INFRA-CHECKLIST.md`.

### 3.8. Helyi dev indítás

```bash
npm install
npm run db:check-patches           # Supabase patch állapot ellenőrzés
npm run dev                        # Next.js dev server
npm run worker                     # Külön terminálban: cron worker
```

### 3.9. Kritikus gotchak

1. **`foxpost_terminal_*` vs `pickup_point_*`** — Backward compat miatt **mindkét** oszlopcsoport él. Új kód `resolvePickupPoint()`-tal olvas, de íráskor mindkettőbe ír (lásd `pickupFieldsFromFoxpost`, `pickupFieldsFromPacketa` a `src/lib/pickupPoint.ts`-ben).
2. **`fetchTransactionWithColumnFallback`** — Ha új oszlop hiányzik a DB-ből, fallback a régi select-re. Védőháló deploy alatt.
3. **`react-hooks/refs` és `set-state-in-effect`** — React 19 új szabályok. `useProducts.ts`-ben már átalakítva, de új komponensnél figyelni: useRef.current értékadás csak useEffect-ben, vagy esemény handlerben.
4. **`assertAdminRequest`** — minden admin API route élén ellenőrizni kell. Ne hagyd ki!
5. **Service role key** — soha ne kerüljön kliens oldalra. Csak `app/api/**/route.ts`-ben használható.
6. **Stripe webhook** — signature ellenőrzés kötelező, idempotens kezelés (event.id-vel dedup).

### 3.10. Tesztfiókok / smoke flow

A smoke flow (két fiókkal):

1. **Eladó:** terméket feltölt → push követőknek
2. **Vevő:** terméket kosárba / bundle összerak → wallet egyenleg részben fed → mixed checkout → Stripe success
3. **Eladó:** Foxpost label letölt → Packeta is kipróbál
4. **Vevő:** receipt confirm vagy dispute indít
5. **Eladó:** SellerInsightsPanel-en látja az új eladást, bevételt, top termékben szerepel

---

## 4. V2 — Vite SPA preview mélymerülés

### 4.1. Miért külön projekt?

V2 célja egy **modernebb, gyorsabb frontend** kísérletezés a V1 backend (Next.js API + Supabase) változatlan felhasználásával. Ezért:

- Külön `frontend/` mappa, **független `package.json`**-nal
- Vite build → statikus SPA (Vercel külön projektként is hostolható)
- API hívás proxy-n a V1 backendhez

V2 jelenleg **NEM** production. Csak preview / "coming soon" oldal + alap routing.

### 4.2. Tech stack (V2)

| Komponens | Verzió |
|---|---|
| Build tool | Vite |
| Framework | React 19 |
| Router | React Router v6+ |
| Stílus | Tailwind v4 |
| Nyelv | TypeScript |
| API | Proxy V1 backendhez (dev: `vite.config.ts`-ben) |

### 4.3. V2 mappastruktúra

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── README.md
└── src/
    ├── main.tsx                # React 19 root render
    ├── App.tsx                 # React Router setup
    ├── index.css               # Tailwind v4 imports
    ├── vite-env.d.ts
    └── pages/
        ├── HomePage.tsx        # "Coming soon" landing
        └── BrowsePage.tsx      # API proxy teszt (V1 termékek listája)
```

### 4.4. V2 jelenlegi állapot

- [x] Skeleton fut
- [x] HomePage statikus tartalom
- [x] BrowsePage proxy teszt — V1 `/api/products` hívás működik
- [ ] Auth bridge (Supabase session megosztás Next ↔ Vite) — nincs
- [ ] Checkout, chat, profil — nincs
- [ ] Production deploy konfig — nincs

### 4.5. V2 lehetséges roadmap (nem konkrét feladat, csak ötletek)

1. **Auth bridge:** Supabase session megosztás (közös cookie domain, vagy explicit token átadás).
2. **Termék lista:** Valós Supabase olvasás Vite oldalról (Supabase JS client).
3. **Alap chat:** Realtime feliratkozás.
4. **PWA shell:** offline first, install prompt.
5. **Saját build pipeline:** Vercel külön projekt.

---

## 5. Dokumentáció térkép

| Fájl | Tartalom |
|---|---|
| `INSTRUCTIONS.md` | Master setup, V1 feature lista, SQL patch sorrend, env vars, AI setup, tesztfiókok, prod checklist |
| `docs/VINTED-GAP-ANALYSIS.md` | Feature paritás Vintedhez képest, melyik kész / melyik nem |
| `docs/INFRA-CHECKLIST.md` | Külső szolgáltatás setup: Resend DNS, Stripe Connect, Foxpost / Packeta live API, Vercel Pro, domain, smoke teszt plan |
| `TODO-TOMORROW.md` | Élő TODO, mit kell még csinálni (kód + manuális) |
| `HANDOFF-HOME.md` | Otthoni gépre váltáshoz handoff |
| `AGENTS.md` / `CLAUDE.md` | AI agent szabályok (lásd 2.1.) |
| `frontend/README.md` | V2 Vite projekt setup |

---

## 6. Hátralévő feladatok (csak külső / manuális)

### Kód oldalról MINDEN kész és pusholva (`origin/main`).

**Manuális, amit a user csinál:**

1. Node.js LTS telepítés (`winget install OpenJS.NodeJS.LTS`) — nélküle nincs `npm run dev`
2. Supabase SQL Editorban a hátralévő patch-ek (`patch-vinted-masterpiece.sql` teljes újrafuttatás biztonság kedvéért — `IF NOT EXISTS` minden részen)
3. Resend DNS verify (SPF / DKIM / DMARC)
4. Stripe Connect Live mode + webhook endpoint
5. Foxpost live API kulcs
6. Packeta live widget kulcs
7. Saját domain + SSL
8. Valós futár tracking cron beüzemelés

Részletes lépésenkénti útmutató: `docs/INFRA-CHECKLIST.md`.

---

## 7. AI/fejlesztő munkamenet tippek (új AI-nak)

- **Mindig** olvasd a `AGENTS.md`-t és `CLAUDE.md`-t a repo gyökérből kód írás előtt.
- A Next.js doc a `node_modules/next/dist/docs/`-ban van — ezt használd, ne a training adatot.
- AI funkciókhoz **csak** Ollama (`localhost:11434`), `llama3` chat + `nomic-embed-text` embed.
- **Soha** ne javasolj OpenAI / Anthropic / fizetős külső API-t.
- RTX 3060-ra optimalizálj (GPU-igényes dolgokat).
- Új SQL patch: defenzív (`IF EXISTS` / `IF NOT EXISTS`), idempotens, többször futtatható legyen.
- Új API route: `assertAdminRequest` ha admin, input validáció, Stripe webhookoknál signature ellenőrzés.
- Új komponens kép-renderelésnél: `loading="lazy"` + `decoding="async"`.
- Új checkout logika: a `src/lib/checkoutResolve.ts` mintát kövesd (single + bundle elágazás).
- Pickup pont olvasás: `resolvePickupPoint()` helper, ne közvetlenül oszlopokat.

---

*Generálva: 2026-06-04 — V1 lezárás után*
