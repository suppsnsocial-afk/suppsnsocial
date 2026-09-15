"use client";

import { useState } from "react";
import { persistPurchasedMeal } from "@/lib/storage";
import { useUnlock } from "./useUnlock";

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json()) as { url?: string; unlocked?: boolean; error?: string };
  return data.error ?? fallback;
}

export function useCheckoutActions() {
  const { persistUnlock } = useUnlock();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWorkoutCheckout = async () => {
    setPaying(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "workout" }),
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
      if (!response.ok) {
        throw new Error(await readError(response, "Demo unlock is not available."));
      }
      persistUnlock();
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
        body: JSON.stringify({ product: "meal", mealId }),
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
      const data = (await response.json()) as {
        unlocked?: boolean;
        mealId?: string;
        error?: string;
      };
      if (!response.ok || !data.unlocked || !data.mealId) {
        throw new Error(data.error ?? "Demo unlock is not available.");
      }
      persistPurchasedMeal(data.mealId);
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
