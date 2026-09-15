"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getPurchasedMealServerSnapshot,
  getPurchasedMealSnapshot,
  persistPurchasedMeal,
  subscribeToStorage,
} from "@/lib/storage";

export function usePurchasedMeals() {
  const ids = useSyncExternalStore(
    subscribeToStorage,
    getPurchasedMealSnapshot,
    getPurchasedMealServerSnapshot,
  );

  const isPurchased = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, isPurchased, persistPurchasedMeal, count: ids.length };
}
