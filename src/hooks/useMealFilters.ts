"use client";

import { useSyncExternalStore } from "react";
import {
  getMealFilterServerSnapshot,
  getMealFilterSnapshot,
  saveMealFilters,
  subscribeToStorage,
} from "@/lib/storage";
import type { MealPrepFilters } from "@/lib/types";

export function useMealFilters() {
  const filters = useSyncExternalStore(
    subscribeToStorage,
    getMealFilterSnapshot,
    getMealFilterServerSnapshot,
  );

  const setFilters = (next: MealPrepFilters) => {
    saveMealFilters(next);
  };

  return { filters, setFilters };
}
