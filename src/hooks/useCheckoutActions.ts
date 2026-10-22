"use client";

import { useState } from "react";
import { applyUnlockPayload, type UnlockPayload } from "@/lib/entitlement-client";

async function readPayload(response: Response): Promise<UnlockPayload> {
  return (await response.json()) as UnlockPayload;
}

function idempotencyKey(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function useCheckoutActions() {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWorkoutCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "workout", idempotencyKey: idempotencyKey("workout") }),
      });
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

  const demoUnlockWorkouts = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      const data = await readPayload(response);
      if (!response.ok || !data.unlocked) {
        throw new Error(data.error ?? "Demo unlock is not available.");
      }
      applyUnlockPayload(data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Demo unlock is not available.");
    } finally {
      setPaying(false);
    }
  };

  const startMealCheckout = async (mealId: string) => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "meal",
          mealId,
          idempotencyKey: idempotencyKey(`meal_${mealId}`),
        }),
      });
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

  const demoUnlockMeal = async (mealId: string) => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true, mealId }),
      });
      const data = await readPayload(response);
      if (!response.ok || !data.unlocked || data.product !== "meal" || !data.mealId) {
        throw new Error(data.error ?? "Demo unlock is not available.");
      }
      applyUnlockPayload(data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Demo unlock is not available.");
    } finally {
      setPaying(false);
    }
  };

  return {
    paying,
    error,
    startWorkoutCheckout,
    demoUnlockWorkouts,
    startMealCheckout,
    demoUnlockMeal,
  };
}
