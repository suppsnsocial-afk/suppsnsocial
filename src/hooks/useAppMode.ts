"use client";

import { useSyncExternalStore } from "react";
import {
  getAppModeServerSnapshot,
  getAppModeSnapshot,
  saveAppMode,
  subscribeToStorage,
} from "@/lib/storage";

export function useAppMode() {
  const mode = useSyncExternalStore(
    subscribeToStorage,
    getAppModeSnapshot,
    getAppModeServerSnapshot,
  );

  return { mode, setMode: saveAppMode };
}
