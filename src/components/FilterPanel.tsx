"use client";

import { hasActiveFilters } from "@/lib/filters";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DURATION_BANDS,
  DURATION_LABELS,
  EMPTY_FILTERS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  FOCUSES,
  FOCUS_LABELS,
  type Difficulty,
  type DurationBand,
  type Equipment,
  type Focus,
  type WorkoutFilters,
} from "@/lib/types";

type FilterPanelProps = {
  filters: WorkoutFilters;
  matchCount: number;
  onChange: (filters: WorkoutFilters) => void;
};

type ChipOption<T extends string> = { value: T; label: string };

function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? "border-lime bg-lime text-lime-ink"
                  : "border-line bg-panel-2 text-cream/90 hover:border-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPanel({ filters, matchCount, onChange }: FilterPanelProps) {
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
          label="Focus"
          value={filters.focus}
          onChange={(focus) => onChange({ ...filters, focus })}
          options={[
            { value: "any" as const, label: "Any" },
            ...FOCUSES.map((focus) => ({
              value: focus as Focus | "any",
              label: FOCUS_LABELS[focus],
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
          label="Kit"
          value={filters.equipment}
          onChange={(equipment) => onChange({ ...filters, equipment })}
          options={[
            { value: "any" as const, label: "Any" },
            ...EQUIPMENT.map((item) => ({
              value: item as Equipment | "any",
              label: EQUIPMENT_LABELS[item],
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
            onClick={() => onChange(EMPTY_FILTERS)}
            className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </details>
  );
}
