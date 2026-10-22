"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  ensureEntitlementsLoaded,
  getEntitlementClientSnapshot,
  getEntitlementServerSnapshot,
  subscribeEntitlements,
} from "@/lib/entitlement-client";

export function useUnlock() {
  const view = useSyncExternalStore(
    subscribeEntitlements,
    getEntitlementClientSnapshot,
    getEntitlementServerSnapshot,
  );

  useEffect(() => {
    void ensureEntitlementsLoaded();
  }, []);

  return { unlocked: view.workoutUnlocked, ready: view.ready };
}
