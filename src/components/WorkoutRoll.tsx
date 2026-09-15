"use client";

import { useMemo, useState } from "react";
import { workouts } from "@/data/workouts";
import { useCheckoutNotice } from "@/components/CheckoutReturn";
import { useCheckoutActions } from "@/hooks/useCheckoutActions";
import { useFavourites } from "@/hooks/useFavourites";
import { useFilters } from "@/hooks/useFilters";
import { useLastWorkout } from "@/hooks/useLastWorkout";
import { useUnlock } from "@/hooks/useUnlock";
import { filterWorkouts, pickWorkout } from "@/lib/filters";
import type { UnlockConfig } from "@/lib/unlock";
import type { Workout } from "@/lib/types";
import { FilterPanel } from "./FilterPanel";
import { Paywall } from "./Paywall";
import { WorkoutCard } from "./WorkoutCard";

type WorkoutRollProps = {
  config: UnlockConfig;
};

export function WorkoutRoll({ config }: WorkoutRollProps) {
  const { unlocked } = useUnlock();
  const notice = useCheckoutNotice();
  const checkout = useCheckoutActions();
  const { filters, setFilters } = useFilters();
  const { toggle, isSaved } = useFavourites();
  const { lastId, setLastId } = useLastWorkout();
  const restored = workouts.find((item) => item.id === lastId) ?? null;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const shown = workout ?? restored;
  const [rolling, setRolling] = useState(false);
  const [empty, setEmpty] = useState(false);

  const matchCount = useMemo(() => filterWorkouts(workouts, filters).length, [filters]);

  const roll = (excludeId?: string) => {
    if (rolling) return;
    setRolling(true);
    setEmpty(false);

    window.setTimeout(() => {
      const next = pickWorkout(workouts, filters, excludeId);
      setWorkout(next);
      setLastId(next?.id ?? null);
      setEmpty(next === null);
      setRolling(false);
    }, 280);
  };

  return (
    <>
      <section className="space-y-3">
        <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-cream">
          Can&apos;t decide?
          <span className="block text-lime">We&apos;ll pick it.</span>
        </h1>
        <p className="max-w-sm text-[15px] leading-relaxed text-muted">
          {unlocked
            ? "One tap. A clear method. Get moving — hotel room, home floor or gym floor."
            : "£1 unlocks workout ideas on this phone. Meal prep is 50p per idea — switch tabs anytime."}
        </p>
      </section>

      {unlocked ? (
        <>
          <button
            type="button"
            onClick={() => roll(shown?.id)}
            disabled={rolling}
            className="surprise-button min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime px-5 text-lg font-extrabold tracking-tight text-lime-ink shadow-[0_12px_40px_rgba(200,245,66,0.22)] disabled:opacity-70"
          >
            {rolling ? "Picking your session…" : shown ? "Give me another" : "Surprise me"}
          </button>

          <FilterPanel filters={filters} matchCount={matchCount} onChange={setFilters} />

          {empty ? (
            <div className="rounded-2xl border border-line bg-panel px-4 py-5 text-sm leading-relaxed text-muted">
              Nothing matches those filters. Loosen them, or clear and roll again.
            </div>
          ) : null}

          {shown ? (
            <WorkoutCard
              workout={shown}
              saved={isSaved(shown.id)}
              onToggleSave={() => toggle(shown.id)}
              onReroll={() => roll(shown.id)}
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
        </>
      ) : (
        <Paywall
          config={config}
          cancelled={notice.cancelledWorkout}
          verifying={notice.verifyingWorkout}
          error={notice.error ?? checkout.error}
          paying={checkout.paying}
          onPay={() => void checkout.startWorkoutCheckout()}
          onDemoUnlock={() => void checkout.demoUnlockWorkouts()}
        />
      )}
    </>
  );
}
