# Teszt fiókok — Robeo V1

**Fontos:** Jelszavak és email címek **nem** kerülnek a gitbe. Töltsd ki a saját teszt adataiddal (jelszókezelő / `.env.local` mellett tartva).

---

## Szerepkör-modell

| Teszt szerep | DB `profiles.role` | Mit tesztesz vele |
|--------------|-------------------|-------------------|
| Admin | `admin` | AdminHub, kiemelés, disputes, seller_verified, jelentések |
| Seller | `user` (alap) | Termék feltöltés, ajánlatok elfogadása, eladás, Stripe Connect |
| Buyer | `user` (alap) | Böngészés, ajánlat, vásárlás, dispute nyitás |

Ugyanaz a fiók lehet egyszerre seller és buyer is — külön tranzakciókban. **Admin fiókkal ne tölts fel / ne vásárolj** (AdminHub figyelmeztet is).

---

## Ajánlott 3 fiók (sablon)

| Szerep | Email (cseréld!) | Jelszó | Megjegyzés |
|--------|------------------|--------|------------|
| Admin | `_____________@____` | (jelszókezelő) | Reg után: `grant-admin-role.mjs` |
| Seller | `_____________@____` | (jelszókezelő) | Feltöltés, eladó oldal |
| Buyer | `_____________@____` | (jelszókezelő) | Vásárlás, counter-offer |

### Admin jog adása

```bash
node scripts/grant-admin-role.mjs admin@example.com
```

Előfeltétel: `.env.local`-ban `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

Alternatíva SQL-ben (Supabase SQL Editor):

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## Regisztráció

1. `/register` — mindhárom fiók
2. Email megerősítés (Supabase Auth beállítás szerint)
3. Admin fióknak admin role (fent)
4. Seller: legal accept + feltöltés wizard
5. Buyer: követés sellerre (follower notify teszthez) → vásárlás

---

## Stripe teszt

- Lokálisan `STRIPE_SECRET_KEY=sk_test_...`
- Webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Tesztkártya: Stripe docs szerinti `4242...` sorozat

Wallet checkout: seller/ buyer wallet egyenleg RPC-n keresztül (admin nem szükséges).

---

## E2E scriptek (opcionális)

```bash
node scripts/run-seller-new-item-e2e.mjs
node scripts/run-e2e-notification-pipeline.mjs
```

Service role + bejelentkezett user meta kell; sellernek legyen legalább 1 követő (buyer fiókkal follow).

---

## Mi NINCS külön „seller role”

- `seller_verified` — admin kapcsolja (ellenőrzött jelvény), nem regisztrációs lépés
- `vacation_mode` — profil beállítás
- Stripe Connect — kifizetéshez, külön onboarding flow
