import type { ReactNode } from "react";
import { formatDuration, formatServings } from "@/lib/filters";
import {
  DIFFICULTY_LABELS,
  MEAL_DIET_LABELS,
  MEAL_FOCUS_LABELS,
  MEAL_KITCHEN_LABELS,
  type MealPrep,
} from "@/lib/types";

type MealPrepCardProps = {
  meal: MealPrep;
  saved: boolean;
  onToggleSave: () => void;
  onReroll?: () => void;
  rolling?: boolean;
  locked?: boolean;
  priceLabel?: string;
  stripeConfigured?: boolean;
  demoUnlockAvailable?: boolean;
  unlocking?: boolean;
  unlockError?: string | null;
  cancelled?: boolean;
  onUnlock?: () => void;
  onDemoUnlock?: () => void;
};

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-xs font-semibold text-cream/90">
      {children}
    </span>
  );
}

export function MealPrepCard({
  meal,
  saved,
  onToggleSave,
  onReroll,
  rolling = false,
  locked = false,
  priceLabel = "50p",
  stripeConfigured = true,
  demoUnlockAvailable = false,
  unlocking = false,
  unlockError = null,
  cancelled = false,
  onUnlock,
  onDemoUnlock,
}: MealPrepCardProps) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${
        rolling ? "opacity-70" : ""
      }`}
    >
      <div className="h-1.5 bg-gradient-to-r from-ember via-lime to-ember" />
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">
            {locked ? "Meal preview" : <>This week&apos;s prep</>}
          </p>
          <h2 className="font-display text-[1.85rem] leading-none tracking-wide text-cream">
            {meal.name}
          </h2>
          <p className="text-[15px] leading-relaxed text-muted">{meal.description}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <MetaChip>{MEAL_FOCUS_LABELS[meal.focus]}</MetaChip>
          <MetaChip>{MEAL_DIET_LABELS[meal.diet]}</MetaChip>
          <MetaChip>{formatDuration(meal.durationMinutes)}</MetaChip>
          <MetaChip>{formatServings(meal.servings)}</MetaChip>
          <MetaChip>{MEAL_KITCHEN_LABELS[meal.equipment]}</MetaChip>
          <MetaChip>{DIFFICULTY_LABELS[meal.difficulty]}</MetaChip>
        </div>

        {locked ? (
          <div className="space-y-3 rounded-2xl border border-line bg-ink/40 px-4 py-5">
            <div className="space-y-2">
              <h3 className="font-display text-2xl tracking-wide text-cream">
                Unlock this meal — {priceLabel}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {priceLabel} gets you the full step-by-step method for this idea. This phone keeps
                it. You will not pay again for the same meal.
              </p>
            </div>

            {cancelled ? (
              <p className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-muted">
                Payment cancelled. You can try again when you are ready.
              </p>
            ) : null}

            {unlockError ? (
              <p className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-cream">
                {unlockError}
              </p>
            ) : null}

            {stripeConfigured ? (
              <button
                type="button"
                onClick={onUnlock}
                disabled={unlocking}
                className="surprise-button min-h-12 w-full rounded-2xl bg-lime px-4 text-sm font-bold text-lime-ink disabled:opacity-70"
              >
                {unlocking ? "Please wait…" : `Pay ${priceLabel} to unlock this meal`}
              </button>
            ) : (
              <div className="rounded-xl border border-line bg-panel px-3 py-3 text-sm leading-relaxed text-muted">
                Configure Stripe to take the {priceLabel} payment. See the README.
              </div>
            )}

            {demoUnlockAvailable ? (
              <button
                type="button"
                onClick={onDemoUnlock}
                disabled={unlocking}
                className="min-h-11 w-full rounded-2xl border border-line px-4 text-sm font-semibold text-muted disabled:opacity-60"
              >
                Unlock this meal for local testing
              </button>
            ) : null}
          </div>
        ) : (
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              How to make it
            </h3>
            <ol className="space-y-3">
              {meal.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-cream/95">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-lime-ink">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {locked ? null : (
            <button
              type="button"
              onClick={onToggleSave}
              className={`min-h-12 flex-1 rounded-2xl border px-4 text-sm font-bold transition ${
                saved
                  ? "border-lime bg-lime/15 text-lime"
                  : "border-line bg-panel-2 text-cream"
              }`}
            >
              {saved ? "Saved" : "Save this"}
            </button>
          )}
          {onReroll ? (
            <button
              type="button"
              onClick={onReroll}
              disabled={rolling}
              className={`min-h-12 rounded-2xl bg-cream px-4 text-sm font-bold text-ink disabled:opacity-60 ${
                locked ? "w-full" : "flex-1"
              }`}
            >
              {rolling ? "Picking…" : "Another one"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
