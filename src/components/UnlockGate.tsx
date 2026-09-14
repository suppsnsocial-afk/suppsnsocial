"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUnlock } from "@/hooks/useUnlock";
import type { UnlockConfig } from "@/lib/unlock";
import { Paywall } from "./Paywall";

type UnlockGateProps = {
  config: UnlockConfig;
  children: ReactNode;
};

function UnlockGateInner({ config, children }: UnlockGateProps) {
  const { unlocked, persistUnlock } = useUnlock();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("checkout") === "cancelled";

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedSession, setFailedSession] = useState<string | null>(null);
  const verifying = Boolean(sessionId) && !unlocked && sessionId !== failedSession;

  useEffect(() => {
    if (!sessionId || unlocked || sessionId === failedSession) return;

    const controller = new AbortController();

    void fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { unlocked?: boolean; error?: string };
        if (!response.ok || !data.unlocked) {
          throw new Error(data.error ?? "Payment could not be confirmed.");
        }
        persistUnlock();
        router.replace(pathname);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setFailedSession(sessionId);
        setError(caught instanceof Error ? caught.message : "Payment could not be confirmed.");
      });

    return () => controller.abort();
  }, [sessionId, unlocked, failedSession, persistUnlock, router, pathname]);

  const startCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start Stripe Checkout.");
      }
      window.location.assign(data.url);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not start Stripe Checkout.");
      setPaying(false);
    }
  };

  const demoUnlock = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      const data = (await response.json()) as { unlocked?: boolean; error?: string };
      if (!response.ok || !data.unlocked) {
        throw new Error(data.error ?? "Demo unlock is not available.");
      }
      persistUnlock();
      router.replace(pathname);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Demo unlock is not available.");
    } finally {
      setPaying(false);
    }
  };

  if (unlocked) {
    return children;
  }

  return (
    <Paywall
      config={config}
      cancelled={cancelled && !sessionId}
      verifying={verifying}
      error={error}
      paying={paying}
      onPay={() => void startCheckout()}
      onDemoUnlock={() => void demoUnlock()}
    />
  );
}

function PaywallFallback({ config }: { config: UnlockConfig }) {
  return (
    <Paywall
      config={config}
      cancelled={false}
      verifying={false}
      error={null}
      paying={false}
      onPay={() => undefined}
      onDemoUnlock={() => undefined}
    />
  );
}

export function UnlockGate({ config, children }: UnlockGateProps) {
  return (
    <Suspense fallback={<PaywallFallback config={config} />}>
      <UnlockGateInner config={config}>{children}</UnlockGateInner>
    </Suspense>
  );
}
