"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { workouts } from "@/data/workouts";
import { useFavourites } from "@/hooks/useFavourites";
import type { Workout } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { WorkoutCard } from "./WorkoutCard";

export function FavouritesApp() {
  const { ids, toggle, isSaved, count } = useFavourites();
  const [openId, setOpenId] = useState<string | null>(null);

  const savedWorkouts = useMemo(() => {
    const byId = new Map(workouts.map((workout) => [workout.id, workout]));
    return ids
      .map((id) => byId.get(id))
      .filter((workout): workout is Workout => Boolean(workout));
  }, [ids]);

  const openWorkout = savedWorkouts.find((workout) => workout.id === openId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader favouriteCount={count} current="saved" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-cream">Saved sessions</h1>
          <p className="mt-2 text-sm text-muted">Kept on this phone. No account needed.</p>
        </div>

        {savedWorkouts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-panel/60 px-5 py-10 text-center">
            <p className="font-display text-2xl tracking-wide text-cream">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Roll a session and tap Save this. It will show up here next time.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-lime px-5 text-sm font-bold text-lime-ink"
            >
              Surprise me
            </Link>
          </div>
        ) : openWorkout ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="text-sm font-semibold text-lime"
            >
              ← All saved
            </button>
            <WorkoutCard
              workout={openWorkout}
              saved={isSaved(openWorkout.id)}
              onToggleSave={() => {
                toggle(openWorkout.id);
                setOpenId(null);
              }}
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {savedWorkouts.map((workout) => (
              <li key={workout.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(workout.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 text-left"
                >
                  <span>
                    <span className="block font-display text-xl tracking-wide text-cream">
                      {workout.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{workout.description}</span>
                  </span>
                  <span className="shrink-0 text-lg text-lime" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="pt-2 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          Supps n Social Ltd
        </footer>
      </main>
    </div>
  );
}
