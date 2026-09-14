"use client";

import { hasActiveFilters } from "@/lib/filters";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DURATION_BANDS,
  DURATION_LABELS,
  EMPTY_MEAL_FILTERS,
  MEAL_DIETS,
  MEAL_DIET_LABELS,
  MEAL_FOCUSES,
  MEAL_FOCUS_LABELS,
  type Difficulty,
  type DurationBand,
  type MealDiet,
  type MealFocus,
  type MealPrepFilters,
} from "@/lib/types";
import { ChipRow } from "./FilterChips";

type MealFilterPanelProps = {
  filters: MealPrepFilters;
  matchCount: number;
  onChange: (filters: MealPrepFilters) => void;
};

export function MealFilterPanel({ filters, matchCount, onChange }: MealFilterPanelProps) {
  const active = hasActiveFilters(filters);

  return (
    <details className="group rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-cream">
          Filters
          {active ? (
            <span className="ml-2 rounded-full bg-lime/15 px-2 py-0.5 text-xs font-bold text-lime">
              On
            </span>
          ) : (
            <span className="ml-2 text-xs font-medium text-muted">optional</span>
          )}
        </span>
        <span className="text-xs text-muted">
          {matchCount} match{matchCount === 1 ? "" : "es"}
          <span className="ml-2 inline-block transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">
        <ChipRow
          label="Type"
          value={filters.focus}
          onChange={(focus) => onChange({ ...filters, focus })}
          options={[
            { value: "any" as const, label: "Any" },
            ...MEAL_FOCUSES.map((focus) => ({
              value: focus as MealFocus | "any",
              label: MEAL_FOCUS_LABELS[focus],
            })),
          ]}
        />
        <ChipRow
          label="Time"
          value={filters.duration}
          onChange={(duration) => onChange({ ...filters, duration })}
          options={[
            { value: "any" as const, label: "Any" },
            ...DURATION_BANDS.map((band) => ({
              value: band as DurationBand | "any",
              label: DURATION_LABELS[band],
            })),
          ]}
        />
        <ChipRow
          label="Diet"
          value={filters.diet}
          onChange={(diet) => onChange({ ...filters, diet })}
          options={[
            { value: "any" as const, label: "Any" },
            ...MEAL_DIETS.map((item) => ({
              value: item as MealDiet | "any",
              label: MEAL_DIET_LABELS[item],
            })),
          ]}
        />
        <ChipRow
          label="Level"
          value={filters.difficulty}
          onChange={(difficulty) => onChange({ ...filters, difficulty })}
          options={[
            { value: "any" as const, label: "Any" },
            ...DIFFICULTIES.map((item) => ({
              value: item as Difficulty | "any",
              label: DIFFICULTY_LABELS[item],
            })),
          ]}
        />
        {active ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_MEAL_FILTERS)}
            className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </details>
  );
}
