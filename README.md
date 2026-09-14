# Today's Session

A mobile-first web app from **Supps n Social Ltd** for the days you cannot decide what to train.

Unlock is **£1 once** (GBP). After payment, this device keeps access — no account and no subscription. Tap **Surprise me** and get a random workout with a name, focus, time, kit, difficulty and a clear step-by-step method.

## Features

- £1 one-time unlock via Stripe Checkout before workout ideas
- One prominent **Surprise me** / **Give me another** action
- 39 seeded sessions: bodyweight, dumbbells, gym, cardio, HIIT, mobility and short hotel/home work
- Filters for focus, duration, equipment and difficulty
- Re-roll without losing filters
- Local favourites (`localStorage`)
- British English copy, phone-first layout, PWA-friendly manifest

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## £1 unlock and Stripe

Customers see a paywall until this device is unlocked. The price is **£1.00 GBP**, charged once through [Stripe Checkout](https://stripe.com/docs/payments/checkout).

Set these in `.env.local` (or your Vercel project settings):

| Variable | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes, for live payments | Server key used to create and verify Checkout Sessions |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes, for live payments | Marks Stripe as configured in this environment |
| `NEXT_PUBLIC_APP_URL` | Recommended | Origin for success/cancel URLs, e.g. `http://localhost:3000` or your production domain |
| `DEMO_UNLOCK` | Dev only | Set to `true` to show **Unlock for local testing**. Ignored when `NODE_ENV=production` |
| `STRIPE_WEBHOOK_SECRET` | No | Not used in v1. Unlock is confirmed by verifying the Checkout Session when Stripe sends the customer back |

Success returns to `/?session_id={CHECKOUT_SESSION_ID}`. The app verifies that session with Stripe, then stores unlock in `localStorage` and a cookie so the same device is not charged again. Cancel returns to `/?checkout=cancelled` and the paywall stays up.

If Stripe keys are missing, the paywall still shows **£1** and a **Configure Stripe** note. The pay button stays disabled. It never pretends a real charge succeeded.

### Local testing without Stripe keys

In development only:

```bash
DEMO_UNLOCK=true
```

Then use **Unlock for local testing** on the paywall. That control is not available in production builds (`next start` / Vercel).

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
- Stripe Checkout (one-time £1.00 GBP)
- Static workout data in `src/data/workouts.ts`

## Product note

Saved sessions and unlock live on the device. Clearing site data clears favourites and the £1 unlock, so the paywall will ask again.
