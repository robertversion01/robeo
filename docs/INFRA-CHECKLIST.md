# ROBEO infra checklist — éles indulás előtt

Külső szolgáltatások bekapcsolása. Mindegyiknél: mit kell megtenni, hova kell tenni a kulcsot,
és mit ellenőrizz utána.

---

## 1. Resend — email értesítések

**Cél:** offer, sale és dispute email kiküldés saját `@robeo.hu` (vagy hasonló) domainből.

### Lépések

1. [resend.com](https://resend.com) — regisztrálj (ingyenes tier: 100 email/nap, 3000 / hó).
2. **API Keys → Create API Key**
   - Név: `robeo-prod`
   - Permission: `Sending access`
   - Másold az `re_...` kulcsot.
3. **Domains → Add Domain**
   - Add hozzá a domaint (pl. `robeo.hu` vagy `mail.robeo.hu` subdomain).
   - **Másold a 3 DNS rekordot** (SPF / DKIM / DMARC) és töröld be a DNS szolgáltatódnál
     (Cloudflare / GoDaddy / domain registrar).
   - Kattints **Verify Domain** — pár percen belül zöld.
4. **Vercel → Project Settings → Environment Variables** (Production):
   - `RESEND_API_KEY=re_...`
   - `RESEND_FROM=Robeo <noreply@robeo.hu>` (a verified domainből!)
   - `EMAIL_FROM=noreply@robeo.hu` (fallback)
5. Vercel redeploy.

### Ellenőrzés

```bash
curl -X POST https://robeo.vercel.app/api/test/email-send \
  -H "Content-Type: application/json" \
  -d '{"to":"a-te-email@example.com","subject":"Robeo teszt"}'
```

Vagy: nyomj egy valós ajánlatot a tesztfiókoddal — figyeld a Vercel log-ot: `[email]` prefix.

### Fallback (Resend nélkül)

Ha Resend nem elérhető, SMTP-re fallback (Gmail app password / Mailhog dev).
Részletek: `.env.example` SMTP_* szekció.

---

## 2. Stripe Connect — éles eladói payout

**Cél:** Az eladók KYC után a Stripe automatikusan átutalja a nettó bevételt.

### Lépések

1. **Stripe Dashboard → Settings → Connect**
   - **Activate Connect** (Connected Accounts) — kötelező cégadatok.
   - Account type: **Express** (egyszerűbb onboarding) vagy **Standard**.
2. **Branding** — logo, primary color, contact email (a Connect onboarding képernyőre).
3. **Webhooks → Add endpoint** (CONNECT):
   - URL: `https://robeo.vercel.app/api/stripe/webhook`
   - Eseménytípusok:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
     - `account.updated` (Connect onboarding állapot)
     - `transfer.created`, `payout.created`
   - Másold a `whsec_...` aláírást.
4. **Vercel env vars** (Production):
   - `STRIPE_SECRET_KEY=sk_live_...` (Live mode!)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (a CONNECT végpontból!)
   - `FALLBACK_STRIPE_ACCOUNT_ID=` üres legyen — minden eladó saját accountot kap
5. Vercel redeploy.

### Eladó onboarding flow

1. Eladó belép → Profile → Wallet kártya → **„Bankszámla összekötése (Stripe)”**
2. Átirányítás Stripe Connect Express onboardingra (cég/egyéni adatok, IBAN)
3. Sikeres KYC után visszatérés → `profiles.is_seller_onboarded=true` + `stripe_account_id`

### Ellenőrzés

- Tesztvásárlás → Stripe Dashboard → Connect → Connected Accounts → balance / payouts megjelenik.
- Vercel log: `[stripe-webhook]` események sikeresen feldolgozva.

---

## 3. Foxpost — éles automata API

**Cél:** Termék feladásakor valódi Foxpost címke generálás + tracking.

### Lépések

1. **Foxpost B2B kapcsolat** → ügyfélkapcsolati menedzser (sales@foxpost.hu)
   - Kérj API hozzáférést — címke generálás + tracking
   - Megkapod: API base URL + auth token (vagy username/password)
2. **Vercel env vars** (Production):
   - `FOXPOST_API_URL=https://api.foxpost.hu/...` (a Foxpost ad)
   - `FOXPOST_API_TOKEN=...` vagy felhasználó+jelszó
3. A `src/lib/foxpostClient.ts` `createFoxpostShipment` ma fake tracking number-t ad —
   cseréld le valós HTTP hívásra (a Foxpost API doksi alapján).

### Ellenőrzés

- Teszt rendelés → eladó címkét kér → Vercel log: `[foxpost-label]`
- A Foxpost portálon megjelenik a feladott csomag

---

## 4. Packeta — éles átvevőhely widget

**Cél:** Packeta Z-pontok valós kereső + címke.

### Lépések

1. **[Packeta partner regisztráció](https://www.packeta.hu/)**
   - Cég adatok, IBAN
   - Megkapod a widget **API key**-t és az integration ID-t
2. **Vercel env vars** (Production):
   - `NEXT_PUBLIC_PACKETA_API_KEY=...` (publikus widget kulcs)
   - `PACKETA_API_PASSWORD=...` (label generation, ha lesz)
3. A `src/components/checkout/PacketaPointPicker.tsx` ma statikus HU listát mutat —
   ha a `NEXT_PUBLIC_PACKETA_API_KEY` be van állítva, a Packeta widget töltődik be.
4. Live widget HTML script tag: `https://widget.packeta.com/v6/www/js/library.js`.

### Ellenőrzés

- Checkout → Packeta opció → widget megnyílik valós pontkereső
- A választott pont megjelenik a tranzakcióban

---

## 5. Valós futár tracking

**Cél:** A vevő látja, hogy hol jár a csomag (PDF state machine helyett valós API).

### Lépések

1. **Foxpost tracking** — saját API: status polling 1-3 óránként cronból
   - Új cron a `vercel.json`-ban (Hobby: ne, Pro: igen — Hobby 1 cron limit)
   - VAGY GitHub Actions worker (most a saved-search-scan ott fut)
2. **Packeta tracking** — Packeta REST API (külön végpont, kell auth header)
3. **DB:** `transactions.tracking_number` + `tracking_carrier` ✓ már van.
4. Hozz létre `src/lib/trackingPoll.ts`-t és cron worker route-ot.

---

## Vercel Pro upgrade (opcionális)

Hobby plan korlátok:
- 1 cron / nap
- 100 GB-month bandwidth
- 12 serverless funkció / deploy
- 10 sec serverless timeout

Pro (~$20/hó):
- Több cron, hosszabb timeout, több bandwidth
- Audit log, multi-env, password protection
- **Akkor kell, ha** valós forgalom > 100 user/nap

---

## .env Production checklist

Mielőtt élesítesz, **mindegyik kötelező** legyen kitöltve a Vercel Production env-ben:

| Kulcs | Forrás |
|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard (titkos!) |
| `STRIPE_SECRET_KEY` | Stripe (sk_live_) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook (Connect endpoint) |
| `NEXT_PUBLIC_BASE_URL` | `https://robeo.vercel.app` (vagy saját domain) |
| `CRON_SECRET` | random 64-char string |
| `RESEND_API_KEY` | Resend (re_...) |
| `RESEND_FROM` | Verified domain |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | `node scripts/generate-vapid-keys.mjs` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | = `VAPID_PUBLIC_KEY` |
| `VAPID_SUBJECT` | `mailto:notify@robeo.hu` |

Opcionális (akkor kell, ha kapcsolod):

| Kulcs | Mikor |
|-------|-------|
| `FOXPOST_API_URL` + `FOXPOST_API_TOKEN` | Foxpost éles label |
| `NEXT_PUBLIC_PACKETA_API_KEY` | Packeta live widget |
| `FALLBACK_STRIPE_ACCOUNT_ID` | Demó / fejlesztés |
| `SMTP_*` | Resend nélkül |
| `NEXT_PUBLIC_OLLAMA_URL` + `NEXT_PUBLIC_OLLAMA_CHAT_MODEL` | Dev only (localhost) |

---

## Saját domain (opcionális, de ajánlott)

1. Vercel → Project → Settings → Domains → Add `robeo.hu`
2. DNS-en `A` rekord vagy `CNAME` a Vercel által megadott értékre.
3. Vercel auto-megújít SSL.
4. Frissítsd a `NEXT_PUBLIC_BASE_URL=https://robeo.hu` env-et és redeploy.
5. Resend FROM, Stripe webhook URL, OG meta linkek mind a domainre cserélődnek.

---

## Production deploy önteszt (smoke)

Indulás után 30 perc smoke (anonymous + saját fiókkal):

- [ ] Főoldal betöltődik (< 3s)
- [ ] `/sitemap.xml` és `/robots.txt` 200
- [ ] Termék PDP — JSON-LD látszik (View Source)
- [ ] Regisztráció + email confirm
- [ ] Új termék feltöltés (1 kép, 1 méret, ár)
- [ ] Másik fiók: ajánlat küldés → első fiók push + email kap
- [ ] Ajánlat elfogadás → checkout → Stripe test card → success
- [ ] Tranzakció megjelenik mindkét fiók orders / chat
- [ ] Eladó: címke generálás (Foxpost terminal)
- [ ] Vevő: confirm receipt
- [ ] Wallet: eladó látja a pending → 5 nap múlva available

Bármelyik akad → Vercel log-ban keress: `[stripe-webhook]`, `[email]`, `[foxpost-label]`, `[checkout]`.
