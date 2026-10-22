export type EntitlementView = {
  ready: boolean;
  workoutUnlocked: boolean;
  mealIds: string[];
};

const EMPTY_MEAL_IDS: string[] = [];

const SERVER_SNAPSHOT: EntitlementView = {
  ready: false,
  workoutUnlocked: false,
  mealIds: EMPTY_MEAL_IDS,
};

let current: EntitlementView = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

export function subscribeEntitlements(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntitlementClientSnapshot(): EntitlementView {
  return current;
}

export function getEntitlementServerSnapshot(): EntitlementView {
  return SERVER_SNAPSHOT;
}

export function applyEntitlements(next: { workoutUnlocked: boolean; mealIds: string[] }): void {
  const mealIds = next.mealIds.filter((id): id is string => typeof id === "string");
  if (
    current.ready &&
    current.workoutUnlocked === next.workoutUnlocked &&
    sameIds(current.mealIds, mealIds)
  ) {
    return;
  }
  current = {
    ready: true,
    workoutUnlocked: next.workoutUnlocked,
    mealIds,
  };
  emit();
}

export async function refreshEntitlements(): Promise<void> {
  try {
    const response = await fetch("/api/entitlements", { cache: "no-store" });
    if (!response.ok) {
      applyEntitlements({ workoutUnlocked: false, mealIds: [] });
      return;
    }
    const data = (await response.json()) as { workoutUnlocked?: boolean; mealIds?: unknown };
    applyEntitlements({
      workoutUnlocked: data.workoutUnlocked === true,
      mealIds: Array.isArray(data.mealIds)
        ? data.mealIds.filter((id): id is string => typeof id === "string")
        : [],
    });
  } catch {
    applyEntitlements({ workoutUnlocked: false, mealIds: [] });
  }
}

export function ensureEntitlementsLoaded(): Promise<void> {
  if (current.ready) return Promise.resolve();
  if (!inflight) {
    inflight = refreshEntitlements().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export type UnlockPayload = {
  unlocked?: boolean;
  product?: string;
  mealId?: string | null;
  workoutUnlocked?: boolean;
  mealIds?: string[];
  error?: string;
};

export function applyUnlockPayload(data: UnlockPayload): void {
  if (!Array.isArray(data.mealIds) || typeof data.workoutUnlocked !== "boolean") return;
  applyEntitlements({
    workoutUnlocked: data.workoutUnlocked,
    mealIds: data.mealIds.filter((id): id is string => typeof id === "string"),
  });
}
