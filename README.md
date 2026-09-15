# Today's Session

A mobile-first web app from **Supps n Social Ltd** for the days you cannot decide what to train or what to meal prep.

Switch between **Workout ideas** and **Meal prep ideas**. Workouts unlock **£1 once** (GBP) on this device. Each meal prep idea unlocks at **50p** (GBP £0.50) — you get that meal’s method, and this phone keeps it so you are not charged twice for the same meal.

## Features

- Thumb-friendly switch between workout and meal prep
- **£1 one-time** Stripe Checkout unlock for workout ideas (this device)
- **50p per meal** Stripe Checkout to reveal that meal prep’s step-by-step method
- Purchased meal IDs persist in `localStorage` — same meal is not charged again
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

Set these in `.env.local` (or your Vercel project settings):

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes, for live payments | Server key used to create and verify Checkout Sessions |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes, for live payments | Marks Stripe as configured in this environment |
| `NEXT_PUBLIC_APP_URL` | Recommended | Origin for success/cancel URLs, e.g. `http://localhost:3000` or your production domain |
| `DEMO_UNLOCK` | Dev only | Set to `true` to show local-testing unlocks for workouts and individual meals. Ignored when `NODE_ENV=production` |
| `STRIPE_WEBHOOK_SECRET` | No | Not used in v1. Unlock is confirmed by verifying the Checkout Session when Stripe sends the customer back |

### Workouts (£1)

Customers see the workout paywall until this device is unlocked. Success returns to `/?session_id={CHECKOUT_SESSION_ID}`. The app verifies that session, then stores unlock in `localStorage` and a cookie. Cancel returns to `/?checkout=cancelled`.

### Meal prep (50p each)

Roll is free. The name, description and chips show; the method stays locked until they pay **50p** for that meal id. Success returns to `/?meal_session_id={CHECKOUT_SESSION_ID}`. The app verifies the session, stores that meal id, and shows the method. Cancel returns to `/?meal_checkout=cancelled`. Paying again for a meal already on this phone is not required.

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

This is a standard Next.js App Router project. Deploy on [Vercel](https://vercel.com) and add the Stripe environment variables above. Point `NEXT_PUBLIC_APP_URL` at the production URL.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Stripe Checkout (£1.00 workouts, 50p per meal)
- Static workout data in `src/data/workouts.ts`
- Static meal prep data in `src/data/meal-preps.ts` (typical recipe estimates: kcal, protein, carbs, fat, fibre, sugar, salt, serving and batch weight)

## Product note

Saved ideas, the £1 workout unlock, and purchased meal ids live on the device. Clearing site data clears them, so the paywalls will ask again.
