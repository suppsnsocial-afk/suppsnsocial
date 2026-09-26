"use client";

import { useMemo, useState } from "react";
import { mealPreps } from "@/data/meal-preps";
import { useCheckoutNotice } from "@/components/CheckoutReturn";
import { useCheckoutActions } from "@/hooks/useCheckoutActions";
import { useFavourites } from "@/hooks/useFavourites";
import { useLastMeal } from "@/hooks/useLastMeal";
import { useMealFilters } from "@/hooks/useMealFilters";
import { usePurchasedMeals } from "@/hooks/usePurchasedMeals";
import { filterMealPreps, pickMealPrep } from "@/lib/filters";
import type { UnlockConfig } from "@/lib/unlock";
import type { MealPrep } from "@/lib/types";
import { MealFilterPanel } from "./MealFilterPanel";
import { MealPrepCard } from "./MealPrepCard";

type MealPrepRollProps = {
  config: UnlockConfig;
};

export function MealPrepRoll({ config }: MealPrepRollProps) {
  const { filters, setFilters } = useMealFilters();
  const { toggle, isSaved } = useFavourites();
  const { lastId, setLastId } = useLastMeal();
  const { ids: purchasedIds, isPurchased } = usePurchasedMeals();
  const notice = useCheckoutNotice();
  const checkout = useCheckoutActions();
  const restored = mealPreps.find((item) => item.id === lastId) ?? null;
  const [meal, setMeal] = useState<MealPrep | null>(null);
  const shown = meal ?? restored;
  const [rolling, setRolling] = useState(false);
  const [empty, setEmpty] = useState(false);
  const locked = Boolean(shown && !isPurchased(shown.id));

  const matchCount = useMemo(() => filterMealPreps(mealPreps, filters).length, [filters]);

  const roll = (excludeId?: string) => {
    if (rolling) return;
    setRolling(true);
    setEmpty(false);

    window.setTimeout(() => {
      const next = pickMealPrep(mealPreps, filters, excludeId, purchasedIds);
      setMeal(next);
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
          <span className="block text-lime">We&apos;ll plate it.</span>
        </h1>
        <p className="max-w-sm text-[15px] leading-relaxed text-muted">
          Roll a meal for free. {config.mealPriceLabel} unlocks that idea&apos;s method. Pay once
          per meal — this phone keeps it.
        </p>
      </section>

      <button
        type="button"
        onClick={() => roll(shown?.id)}
        disabled={rolling}
        className="surprise-button min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime px-5 text-lg font-extrabold tracking-tight text-lime-ink shadow-[0_12px_40px_rgba(200,245,66,0.22)] disabled:opacity-70"
      >
        {rolling ? "Picking your prep…" : shown ? "Give me another" : "Surprise me"}
      </button>

      <MealFilterPanel filters={filters} matchCount={matchCount} onChange={setFilters} />

      {empty ? (
        <div className="rounded-2xl border border-line bg-panel px-4 py-5 text-sm leading-relaxed text-muted">
          Nothing matches those filters. Loosen them, or clear and roll again.
        </div>
      ) : null}

      {shown ? (
        <MealPrepCard
          meal={shown}
          saved={isSaved(shown.id)}
          onToggleSave={() => toggle(shown.id)}
          onReroll={() => roll(shown.id)}
          rolling={rolling}
          locked={locked}
          priceLabel={config.mealPriceLabel}
          stripeConfigured={config.stripeConfigured}
          demoUnlockAvailable={config.demoUnlockAvailable}
          unlocking={checkout.paying || notice.verifyingMeal}
          unlockError={notice.error ?? checkout.error}
          cancelled={notice.cancelledMeal}
          onUnlock={() => void checkout.startMealCheckout(shown.id)}
          onDemoUnlock={() => void checkout.demoUnlockMeal(shown.id)}
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-line bg-panel/60 px-5 py-8 text-center">
          <p className="font-display text-2xl tracking-wide text-cream">Ready when you are</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            {mealPreps.length} meal preps on file — {config.mealPriceLabel} each for the method.
            High protein, batch cook, quick, vegetarian and budget.
          </p>
        </div>
      )}
    </>
  );
}
