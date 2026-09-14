"use client";

import { useSyncExternalStore } from "react";
import { getUnlockServerSnapshot, getUnlockSnapshot, persistUnlock, subscribeToStorage } from "@/lib/storage";

export function useUnlock() {
  const unlocked = useSyncExternalStore(
    subscribeToStorage,
    getUnlockSnapshot,
    getUnlockServerSnapshot,
  );

  return { unlocked, persistUnlock };
}
