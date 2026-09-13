import type { ReactNode } from "react";
import { formatDuration } from "@/lib/filters";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  FOCUS_LABELS,
  type Workout,
} from "@/lib/types";

type WorkoutCardProps = {
  workout: Workout;
  saved: boolean;
  onToggleSave: () => void;
  onReroll?: () => void;
  rolling?: boolean;
};

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-ink/50 px-2.5 py-1 text-xs font-semibold text-cream/90">
      {children}
    </span>
  );
}

export function WorkoutCard({
  workout,
  saved,
  onToggleSave,
  onReroll,
  rolling = false,
}: WorkoutCardProps) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${
        rolling ? "opacity-70" : ""
      }`}
    >
      <div className="h-1.5 bg-gradient-to-r from-lime via-ember to-lime" />
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">
            Today&apos;s session
          </p>
          <h2 className="font-display text-[1.85rem] leading-none tracking-wide text-cream">
            {workout.name}
          </h2>
          <p className="text-[15px] leading-relaxed text-muted">{workout.description}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <MetaChip>{FOCUS_LABELS[workout.focus]}</MetaChip>
          <MetaChip>{formatDuration(workout.durationMinutes)}</MetaChip>
          <MetaChip>{EQUIPMENT_LABELS[workout.equipment]}</MetaChip>
          <MetaChip>{DIFFICULTY_LABELS[workout.difficulty]}</MetaChip>
        </div>

        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            How to do it
          </h3>
          <ol className="space-y-3">
            {workout.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-cream/95">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-lime-ink">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2 pt-1">
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
          {onReroll ? (
            <button
              type="button"
              onClick={onReroll}
              disabled={rolling}
              className="min-h-12 flex-1 rounded-2xl bg-cream px-4 text-sm font-bold text-ink disabled:opacity-60"
            >
              {rolling ? "Picking…" : "Another one"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
