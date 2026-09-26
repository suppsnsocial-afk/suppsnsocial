"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { persistPurchasedMeal, saveAppMode, saveLastMealId } from "@/lib/storage";
import { useUnlock } from "./useUnlock";

export function usePaymentReturn() {
  const { unlocked, persistUnlock: persistWorkoutUnlock } = useUnlock();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const workoutSessionId = searchParams.get("session_id");
  const mealSessionId = searchParams.get("meal_session_id");
  const cancelledWorkout = searchParams.get("checkout") === "cancelled";
  const cancelledMeal = searchParams.get("meal_checkout") === "cancelled";

  const [error, setError] = useState<string | null>(null);
  const [failedSession, setFailedSession] = useState<string | null>(null);

  const verifyingWorkout =
    Boolean(workoutSessionId) && !unlocked && !mealSessionId && workoutSessionId !== failedSession;
  const verifyingMeal = Boolean(mealSessionId) && mealSessionId !== failedSession;
  const verifying = verifyingWorkout || verifyingMeal;

  useEffect(() => {
    if (!workoutSessionId || unlocked || workoutSessionId === failedSession || mealSessionId) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: workoutSessionId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          unlocked?: boolean;
          product?: string;
          error?: string;
        };
        if (!response.ok || !data.unlocked || data.product === "meal") {
          throw new Error(data.error ?? "Payment could not be confirmed.");
        }
        persistWorkoutUnlock();
        router.replace(pathname);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setFailedSession(workoutSessionId);
        setError(caught instanceof Error ? caught.message : "Payment could not be confirmed.");
      });

    return () => controller.abort();
  }, [
    workoutSessionId,
    mealSessionId,
    unlocked,
    failedSession,
    persistWorkoutUnlock,
    router,
    pathname,
  ]);

  useEffect(() => {
    if (!mealSessionId) return;
    saveAppMode("meal");
  }, [mealSessionId]);

  useEffect(() => {
    if (!mealSessionId || mealSessionId === failedSession) return;

    const controller = new AbortController();

    void fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: mealSessionId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          unlocked?: boolean;
          product?: string;
          mealId?: string;
          error?: string;
        };
        if (!response.ok || !data.unlocked || data.product !== "meal" || !data.mealId) {
          throw new Error(data.error ?? "Payment could not be confirmed.");
        }
        persistPurchasedMeal(data.mealId);
        saveLastMealId(data.mealId);
        saveAppMode("meal");
        router.replace(pathname);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setFailedSession(mealSessionId);
        setError(caught instanceof Error ? caught.message : "Payment could not be confirmed.");
      });

    return () => controller.abort();
  }, [mealSessionId, failedSession, router, pathname]);

  return {
    verifying,
    verifyingWorkout,
    verifyingMeal,
    error,
    cancelledWorkout: cancelledWorkout && !workoutSessionId && !mealSessionId,
    cancelledMeal: cancelledMeal && !mealSessionId,
  };
}
