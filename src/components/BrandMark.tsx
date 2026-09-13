export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-9 items-center justify-center rounded-xl bg-lime text-lime-ink shadow-[0_0_24px_rgba(200,245,66,0.28)] ${className}`}
    >
      <svg viewBox="0 0 32 32" className="size-5" fill="none">
        <path
          d="M8 19.5c0-5.5 4-9 8.4-9 3.2 0 5.3 1.6 6.6 3.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M24 12.5c0 5.5-4 9-8.4 9-3.2 0-5.3-1.6-6.6-3.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="22.6" cy="11.4" r="2.1" fill="currentColor" />
      </svg>
    </span>
  );
}
