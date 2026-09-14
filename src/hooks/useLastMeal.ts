"use client";

import { useSyncExternalStore } from "react";
import {
  getLastMealServerSnapshot,
  getLastMealSnapshot,
  saveLastMealId,
  subscribeToStorage,
} from "@/lib/storage";

export function useLastMeal() {
  const lastId = useSyncExternalStore(
    subscribeToStorage,
    getLastMealSnapshot,
    getLastMealServerSnapshot,
  );

  return { lastId, setLastId: saveLastMealId };
}
