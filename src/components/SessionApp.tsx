"use client";

import { useMemo, useState } from "react";
import { workouts } from "@/data/workouts";
import { useFavourites } from "@/hooks/useFavourites";
import { useFilters } from "@/hooks/useFilters";
import { filterWorkouts, pickWorkout } from "@/lib/filters";
import type { Workout } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { FilterPanel } from "./FilterPanel";
import { WorkoutCard } from "./WorkoutCard";

export function SessionApp() {
  const { filters, setFilters } = useFilters();
  const { toggle, isSaved, count } = useFavourites();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [rolling, setRolling] = useState(false);
  const [empty, setEmpty] = useState(false);

  const matchCount = useMemo(
    () => filterWorkouts(workouts, filters).length,
    [filters],
  );

  const roll = (excludeId?: string) => {
    if (rolling) return;
    setRolling(true);
    setEmpty(false);

    window.setTimeout(() => {
      const next = pickWorkout(workouts, filters, excludeId);
      setWorkout(next);
      setEmpty(next === null);
      setRolling(false);
    }, 280);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader favouriteCount={count} current="home" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <section className="space-y-3">
          <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-cream">
            Can&apos;t decide?
            <span className="block text-lime">We&apos;ll pick it.</span>
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">
            One tap. A clear method. Get moving — hotel room, home floor or gym floor.
          </p>
        </section>

        <button
          type="button"
          onClick={() => roll(workout?.id)}
          disabled={rolling}
          className="surprise-button min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime px-5 text-lg font-extrabold tracking-tight text-lime-ink shadow-[0_12px_40px_rgba(200,245,66,0.22)] disabled:opacity-70"
        >
          {rolling ? "Picking your session…" : workout ? "Give me another" : "Surprise me"}
        </button>

        <FilterPanel filters={filters} matchCount={matchCount} onChange={setFilters} />

        {empty ? (
          <div className="rounded-2xl border border-line bg-panel px-4 py-5 text-sm leading-relaxed text-muted">
            Nothing matches those filters. Loosen them, or clear and roll again.
          </div>
        ) : null}

        {workout ? (
          <WorkoutCard
            workout={workout}
            saved={isSaved(workout.id)}
            onToggleSave={() => toggle(workout.id)}
            onReroll={() => roll(workout.id)}
            rolling={rolling}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-panel/60 px-5 py-8 text-center">
            <p className="font-display text-2xl tracking-wide text-cream">Ready when you are</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              {workouts.length} sessions on file — bodyweight, dumbbells, gym, cardio and mobility.
            </p>
          </div>
        )}

        <footer className="pt-2 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          Supps n Social Ltd
        </footer>
      </main>
    </div>
  );
}
