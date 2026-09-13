"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getFavouriteServerSnapshot,
  getFavouriteSnapshot,
  saveFavouriteIds,
  subscribeToStorage,
} from "@/lib/storage";

export function useFavourites() {
  const ids = useSyncExternalStore(
    subscribeToStorage,
    getFavouriteSnapshot,
    getFavouriteServerSnapshot,
  );

  const toggle = useCallback((id: string) => {
    const current = getFavouriteSnapshot();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [id, ...current];
    saveFavouriteIds(next);
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isSaved, count: ids.length };
}
