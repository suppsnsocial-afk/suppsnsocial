"use client";

import { useSyncExternalStore } from "react";
import {
  getLastWorkoutServerSnapshot,
  getLastWorkoutSnapshot,
  saveLastWorkoutId,
  subscribeToStorage,
} from "@/lib/storage";

export function useLastWorkout() {
  const lastId = useSyncExternalStore(
    subscribeToStorage,
    getLastWorkoutSnapshot,
    getLastWorkoutServerSnapshot,
  );

  return { lastId, setLastId: saveLastWorkoutId };
}
