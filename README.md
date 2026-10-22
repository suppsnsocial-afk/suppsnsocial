# Today's Session

A mobile-first web app from **Supps n Social Ltd** for the days you cannot decide what to train or what to meal prep.

Switch between **Workout ideas** and **Meal prep ideas**. Workouts unlock **£1 once** (GBP) on this device. Each meal prep idea unlocks at **50p** (GBP £0.50) — you get that meal’s method, and this phone keeps it so you are not charged twice for the same meal.

## Features

- Thumb-friendly switch between workout and meal prep
- **£1 one-time** Stripe Checkout unlock for workout ideas (this browser)
- **50p per meal** Stripe Checkout to reveal that meal prep’s step-by-step method
- Unlocks are server-side entitlements, referenced by an HMAC-signed httpOnly cookie — the same meal is not charged again
- One prominent **Surprise me** / **Give me another** action in each mode
- 39 seeded workouts: bodyweight, dumbbells, gym, cardio, HIIT, mobility and short hotel/home work
- 38 seeded meal preps: high protein, batch cook, quick, vegetarian, budget and recovery, each with per-serving macros and serving/batch weight
- Optional filters (workouts: focus, time, kit, level — meals: type, time, diet, level)
- Local favourites (`localStorage`) for unlocked workouts and purchased meal preps
- British English copy, phone-first layout, PWA-friendly manifest

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pricing and Stripe

Both charges use the same Stripe keys. Amounts are GBP.

| Product | Amount | What they get |
| --- | --- | --- |
| Workout unlock | **£1.00** (`unit_amount: 100`) | All workout ideas on this device |
| Meal prep idea | **50p** (`unit_amount: 50`) | That one meal prep card and method |

Use **test keys only** (`sk_test_` / `rk_test_` and `pk_test_`). The server refuses live keys and live-mode objects. A restricted test key (`rk_test_`) is preferred.

Set these in `.env.local` (or your Vercel project settings). Placeholders live in `.env.example`. Do not commit real secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes, for payments | Test secret or restricted key used to create Checkout Sessions |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes, for payments | Test publishable key. Marks Stripe as configured |
| `STRIPE_WEBHOOK_SECRET` | Yes | Verifies `stripe-signature` on the raw body at `/api/webhook` |
| `UNLOCK_COOKIE_SECRET` | Yes | HMAC secret for the unlock cookie. At least 32 characters |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Origin for success/cancel URLs. Host headers are never trusted |
| `KV_REST_API_URL` | Yes in production | Vercel KV / Upstash REST URL for the shared entitlement store |
| `KV_REST_API_TOKEN` | Yes in production | Vercel KV / Upstash REST token |
| `ACCOUNTANCY_LEDGER_PATH` | No | Append-only v1.1 ledger path. Defaults to `.data/accountancy.jsonl` |
| `DEMO_UNLOCK` | Dev only | Set to `true` for local unlocks without a charge. Ignored in production |

A shared server-side store is required in production. The file store under `.data/` is only for a single local Node process. On Vercel, set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel KV / Upstash REST). Without them, production requests fail closed.

Fulfillment runs from the webhook (`checkout.session.completed` and `checkout.session.async_payment_succeeded`) and only when `payment_status` is `paid`. Refunds (`charge.refunded`) and disputes (`charge.dispute.created`) revoke the entitlement. `checkout.session.async_payment_failed` does not grant access. Each Checkout Session id can be bound to one browser.

Confirmed payments append a v1.1 accountancy line (`vat_pence` is always 0 — Supps n Social Ltd is not VAT-registered). The ledger is append-only.

### Workouts (£1)

Customers see the workout paywall until this browser holds an active workout entitlement. Success returns to `/?session_id={CHECKOUT_SESSION_ID}`. The app confirms the session once, stores the entitlement server-side, and sets an httpOnly HMAC cookie that references the entitlement id. Cancel returns to `/?checkout=cancelled`.

### Meal prep (50p each)

Roll is free. The name, description and chips show; the method stays locked until they pay **50p** for that meal id. Success returns to `/?meal_session_id={CHECKOUT_SESSION_ID}`. The same cookie and entitlement store record the meal. Cancel returns to `/?meal_checkout=cancelled`. Paying again for a meal already unlocked on this browser is not required.

### Local webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Pay with test card `4242 4242 4242 4242`. Use any future expiry, any CVC, and any postcode.

If Stripe keys are missing, both pay buttons stay disabled with a **Configure Stripe** note. The app never pretends a real charge succeeded.

### Local testing without Stripe keys

In development only:

```bash
DEMO_UNLOCK=true
```

Then use **Unlock workouts for local testing** on the workout paywall, or **Unlock this meal for local testing** on a locked meal card. Those controls are not available in production builds (`next start` / Vercel).

## Build

```bash
npm run build
npm start
```

## Deploy

This is a standard Next.js App Router project. Deploy on [Vercel](https://vercel.com) and add the environment variables above. Point `NEXT_PUBLIC_APP_URL` at the production URL and attach Vercel KV so entitlements are shared across instances. Register the webhook endpoint `https://<your-domain>/api/webhook` in test mode for the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, and `charge.dispute.created`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Stripe Checkout (£1.00 workouts, 50p per meal)
- Static workout data in `src/data/workouts.ts`
- Static meal prep data in `src/data/meal-preps.ts` (typical recipe estimates: kcal, protein, carbs, fat, fibre, sugar, salt, serving and batch weight)

## Product note

Favourites, filters, and the last roll stay in `localStorage` on this phone. Workout and meal unlocks do not: they are entitlements on the server, named by the signed cookie. Clearing site data removes that cookie, and a Checkout Session cannot be replayed, so the paywall asks again.
