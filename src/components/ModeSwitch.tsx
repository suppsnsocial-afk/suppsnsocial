import type { AppMode } from "@/lib/types";

type ModeSwitchProps = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
};

const OPTIONS: { value: AppMode; label: string }[] = [
  { value: "workout", label: "Workout ideas" },
  { value: "meal", label: "Meal prep ideas" },
];

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="Choose workout or meal prep ideas"
      className="grid grid-cols-2 rounded-[1.35rem] border border-line bg-panel p-1"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-[1.1rem] px-2 text-sm font-bold tracking-tight transition ${
              selected ? "bg-lime text-lime-ink shadow-[0_6px_18px_rgba(200,245,66,0.18)]" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
