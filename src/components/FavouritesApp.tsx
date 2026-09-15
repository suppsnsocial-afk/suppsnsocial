"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mealPreps } from "@/data/meal-preps";
import { workouts } from "@/data/workouts";
import { useCheckoutNotice } from "@/components/CheckoutReturn";
import { useCheckoutActions } from "@/hooks/useCheckoutActions";
import { useFavourites } from "@/hooks/useFavourites";
import { usePurchasedMeals } from "@/hooks/usePurchasedMeals";
import { useUnlock } from "@/hooks/useUnlock";
import type { UnlockConfig } from "@/lib/unlock";
import type { MealPrep, Workout } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { MealPrepCard } from "./MealPrepCard";
import { Paywall } from "./Paywall";
import { WorkoutCard } from "./WorkoutCard";

type SavedItem =
  | { kind: "workout"; item: Workout }
  | { kind: "meal"; item: MealPrep };

type FavouritesAppProps = {
  config: UnlockConfig;
};

export function FavouritesApp({ config }: FavouritesAppProps) {
  const { ids, toggle, isSaved, count } = useFavourites();
  const { unlocked } = useUnlock();
  const { isPurchased } = usePurchasedMeals();
  const notice = useCheckoutNotice();
  const checkout = useCheckoutActions();
  const [openId, setOpenId] = useState<string | null>(null);

  const savedItems = useMemo(() => {
    const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));
    const mealsById = new Map(mealPreps.map((meal) => [meal.id, meal]));

    return ids.flatMap((id): SavedItem[] => {
      const workout = workoutsById.get(id);
      if (workout) return [{ kind: "workout", item: workout }];
      const meal = mealsById.get(id);
      if (meal) return [{ kind: "meal", item: meal }];
      return [];
    });
  }, [ids]);

  const openItem = savedItems.find(({ item }) => item.id === openId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader favouriteCount={count} current="saved" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-cream">Saved ideas</h1>
          <p className="mt-2 text-sm text-muted">Workouts and meal preps, kept on this phone.</p>
        </div>

        {savedItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-panel/60 px-5 py-10 text-center">
            <p className="font-display text-2xl tracking-wide text-cream">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Unlock a workout or a meal prep, then tap Save this. It will show up here next time.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-lime px-5 text-sm font-bold text-lime-ink"
            >
              Surprise me
            </Link>
          </div>
        ) : openItem ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="text-sm font-semibold text-lime"
            >
              ← All saved
            </button>
            {openItem.kind === "workout" ? (
              unlocked ? (
                <WorkoutCard
                  workout={openItem.item}
                  saved={isSaved(openItem.item.id)}
                  onToggleSave={() => {
                    toggle(openItem.item.id);
                    setOpenId(null);
                  }}
                />
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
              )
            ) : (
              <MealPrepCard
                meal={openItem.item}
                saved={isSaved(openItem.item.id)}
                onToggleSave={() => {
                  toggle(openItem.item.id);
                  setOpenId(null);
                }}
                locked={!isPurchased(openItem.item.id)}
                priceLabel={config.mealPriceLabel}
                stripeConfigured={config.stripeConfigured}
                demoUnlockAvailable={config.demoUnlockAvailable}
                unlocking={checkout.paying || notice.verifyingMeal}
                unlockError={notice.error ?? checkout.error}
                cancelled={notice.cancelledMeal}
                onUnlock={() => void checkout.startMealCheckout(openItem.item.id)}
                onDemoUnlock={() => void checkout.demoUnlockMeal(openItem.item.id)}
              />
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {savedItems.map(({ kind, item }) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 text-left"
                >
                  <span>
                    <span className="mb-1 inline-block rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-lime">
                      {kind === "workout" ? "Workout" : "Meal prep"}
                    </span>
                    <span className="block font-display text-xl tracking-wide text-cream">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{item.description}</span>
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
