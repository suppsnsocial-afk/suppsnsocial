"use client";

import { BrandMark } from "./BrandMark";
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
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/80 bg-ink/85">
        <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <BrandMark />
          <span>
            <span className="block font-display text-[1.35rem] leading-none tracking-wide text-cream">
              Today&apos;s Session
            </span>
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Supps n Social
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">
            One-time unlock
          </p>
          <h1 className="font-display text-4xl leading-[0.95] tracking-wide text-cream">
            £1 to unlock
            <span className="block text-lime">workouts and meals.</span>
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted">
            A one-off £1 payment for Supps n Social customers. Then this device keeps access to
            workout and meal prep ideas — no account, no subscription.
          </p>
        </section>

        <div className="rounded-3xl border border-line bg-panel p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">Today&apos;s Session</p>
              <p className="mt-1 font-display text-5xl leading-none tracking-wide text-cream">£1</p>
            </div>
            <p className="pb-1 text-right text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              GBP · one-time
            </p>
          </div>
          <ul className="mt-5 space-y-2 text-sm leading-relaxed text-cream/90">
            <li>Random workouts and meal preps with a clear method</li>
            <li>Filters, re-roll and saved ideas on this phone</li>
            <li>Pay once. Come back whenever you like.</li>
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
            {paying ? "Taking you to checkout…" : "Pay £1 to unlock"}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm leading-relaxed text-muted">
              <p className="font-semibold text-cream">Configure Stripe</p>
              <p className="mt-1">
                Add <span className="text-cream">STRIPE_SECRET_KEY</span> and{" "}
                <span className="text-cream">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> to take the
                £1 payment. See the README.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="min-h-[4.25rem] w-full rounded-[1.6rem] bg-lime/30 px-5 text-lg font-extrabold tracking-tight text-lime-ink/50"
            >
              Pay £1 to unlock
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
            Unlock for local testing
          </button>
        ) : null}

        <footer className="pt-1 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          Supps n Social Ltd
        </footer>
      </main>
    </div>
  );
}
