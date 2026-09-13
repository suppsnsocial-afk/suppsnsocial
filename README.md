# Today's Session

A mobile-first web app from **Supps n Social Ltd** for the days you cannot decide what to train.

Tap **Surprise me** and get a random workout with a name, focus, time, kit, difficulty and a clear step-by-step method. Optional filters stay on when you re-roll. Favourites are saved in the browser — no account required.

## Features

- One prominent **Surprise me** / **Give me another** action
- 39 seeded sessions: bodyweight, dumbbells, gym, cardio, HIIT, mobility and short hotel/home work
- Filters for focus, duration, equipment and difficulty
- Re-roll without losing filters
- Local favourites (`localStorage`)
- British English copy, phone-first layout, PWA-friendly manifest

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deploy

This is a standard Next.js App Router project. Deploy on [Vercel](https://vercel.com) by importing the repository — `npm install` and `npm run build` are the only steps required.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Static workout data in `src/data/workouts.ts`

## Product note

v1 is client-only. Saved sessions live on the device that booked them. Clearing site data clears favourites.
