"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ensureEntitlementsLoaded,
  getEntitlementClientSnapshot,
  getEntitlementServerSnapshot,
  subscribeEntitlements,
} from "@/lib/entitlement-client";

export function usePurchasedMeals() {
  const view = useSyncExternalStore(
    subscribeEntitlements,
    getEntitlementClientSnapshot,
    getEntitlementServerSnapshot,
  );

  useEffect(() => {
    void ensureEntitlementsLoaded();
  }, []);

  const isPurchased = useCallback((id: string) => view.mealIds.includes(id), [view.mealIds]);

  return { ids: view.mealIds, isPurchased, count: view.mealIds.length, ready: view.ready };
}
