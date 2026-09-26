type ChipOption<T extends string> = { value: T; label: string };

export function ChipRow<T extends string>({
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
