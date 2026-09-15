"use client";

import type { UnlockConfig } from "@/lib/unlock";

type PaywallProps = {
  config: UnlockConfig;
  cancelled: boolean;
  verifying: boolean;
  error: string | null;
  paying: boolean;
  onPay: () => void;
  onDemoUnlock: () => void;
};

export function Paywall({
  config,
  cancelled,
  verifying,
  error,
  paying,
  onPay,
  onDemoUnlock,
}: PaywallProps) {
  const busy = paying || verifying;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-panel p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">Workout ideas</p>
            <p className="mt-1 font-display text-5xl leading-none tracking-wide text-cream">£1</p>
          </div>
          <p className="pb-1 text-right text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            GBP · one-time
          </p>
        </div>
        <ul className="mt-5 space-y-2 text-sm leading-relaxed text-cream/90">
          <li>Random workouts with a clear method</li>
          <li>Filters, re-roll and saved sessions on this phone</li>
          <li>Pay once for workouts. Meal prep is 50p per idea.</li>
        </ul>
      </div>

      {cancelled ? (
        <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
          Payment cancelled. You can try again when you are ready.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-cream">
          {error}
        </p>
      ) : null}

      {verifying ? (
        <p className="text-center text-sm font-semibold text-lime">Checking your payment…</p>
      ) : null}

      {config.stripeConfigured ? (
        <button
          type="button"
          onClick={onPay}
          disabled={busy}
          className="surprise-button min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime px-5 text-lg font-extrabold tracking-tight text-lime-ink shadow-[0_12px_40px_rgba(200,245,66,0.22)] disabled:opacity-70"
        >
          {paying ? "Taking you to checkout…" : "Pay £1 to unlock workouts"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-cream">Configure Stripe</p>
            <p className="mt-1">
              Add <span className="text-cream">STRIPE_SECRET_KEY</span> and{" "}
              <span className="text-cream">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> to take the £1
              payment. See the README.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime/30 px-5 text-lg font-extrabold tracking-tight text-lime-ink/50"
          >
            Pay £1 to unlock workouts
          </button>
        </div>
      )}

      {config.demoUnlockAvailable ? (
        <button
          type="button"
          onClick={onDemoUnlock}
          disabled={busy}
          className="min-h-12 w-full rounded-2xl border border-line px-4 text-sm font-semibold text-muted disabled:opacity-60"
        >
          Unlock workouts for local testing
        </button>
      ) : null}
    </div>
  );
}
