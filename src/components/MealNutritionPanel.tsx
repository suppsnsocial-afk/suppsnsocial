import { formatGrams, formatKcal, formatServings, formatWeight } from "@/lib/filters";
import type { MealPrep } from "@/lib/types";

type MealNutritionPanelProps = {
  meal: MealPrep;
  compact?: boolean;
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-ink/50 px-1.5 py-2 text-center">
      <p className="font-display text-[1.05rem] leading-none tracking-wide text-cream">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
    </div>
  );
}

export function MealNutritionPanel({ meal, compact = false }: MealNutritionPanelProps) {
  const { nutrition, servings } = meal;
  const perServing = `Per serving · ${formatWeight(nutrition.servingWeightG)}`;
  const batchLine = `${formatServings(servings)} · batch ${formatWeight(nutrition.batchWeightG)}`;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Nutrition</p>
      <div className="grid grid-cols-4 gap-1.5">
        <Stat value={String(Math.round(nutrition.kcal))} label="kcal" />
        <Stat value={formatGrams(nutrition.proteinG)} label="protein" />
        <Stat value={formatGrams(nutrition.carbsG)} label="carbs" />
        <Stat value={formatGrams(nutrition.fatG)} label="fat" />
      </div>
      {compact ? (
        <p className="text-xs leading-relaxed text-muted">
          {perServing}. {batchLine}.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-xs font-semibold text-cream/90">
              Fibre {formatGrams(nutrition.fibreG)}
            </span>
            <span className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-xs font-semibold text-cream/90">
              Sugar {formatGrams(nutrition.sugarG)}
            </span>
            <span className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-xs font-semibold text-cream/90">
              Salt {formatGrams(nutrition.saltG)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {perServing}. Batch makes {formatServings(servings)}, about{" "}
            {formatWeight(nutrition.batchWeightG)}. Typical recipe estimate — not lab-tested.
          </p>
        </>
      )}
    </div>
  );
}

export function mealMacroSummary(meal: MealPrep): string {
  return `${formatKcal(meal.nutrition.kcal)} · ${formatGrams(meal.nutrition.proteinG)} protein`;
}
