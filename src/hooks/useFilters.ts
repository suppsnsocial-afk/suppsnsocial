"use client";

import { useSyncExternalStore } from "react";
import {
  getFilterServerSnapshot,
  getFilterSnapshot,
  saveFilters,
  subscribeToStorage,
} from "@/lib/storage";
import type { WorkoutFilters } from "@/lib/types";

export function useFilters() {
  const filters = useSyncExternalStore(
    subscribeToStorage,
    getFilterSnapshot,
    getFilterServerSnapshot,
  );

  const setFilters = (next: WorkoutFilters) => {
    saveFilters(next);
  };

  return { filters, setFilters };
}
