import {
  UNLOCK_COOKIE,
  UNLOCK_COOKIE_MAX_AGE,
  UNLOCK_STORAGE_KEY,
  UNLOCK_VALUE,
} from "./unlock";
import {
  DIFFICULTIES,
  DURATION_BANDS,
  EMPTY_FILTERS,
  EQUIPMENT,
  FOCUSES,
  type WorkoutFilters,
} from "./types";

export const FAVOURITES_KEY = "todays-session:favourites";
export const FILTERS_KEY = "todays-session:filters";
export const LAST_WORKOUT_KEY = "todays-session:last";
export const STORAGE_EVENT = "todays-session:storage";

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function parseFavouriteIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function parseFilters(raw: string | null): WorkoutFilters {
  if (!raw) return EMPTY_FILTERS;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutFilters>;
    return {
      focus: parsed.focus === "any" || isOneOf(parsed.focus, FOCUSES) ? parsed.focus : "any",
      duration:
        parsed.duration === "any" || isOneOf(parsed.duration, DURATION_BANDS)
          ? parsed.duration
          : "any",
      equipment:
        parsed.equipment === "any" || isOneOf(parsed.equipment, EQUIPMENT)
          ? parsed.equipment
          : "any",
      difficulty:
        parsed.difficulty === "any" || isOneOf(parsed.difficulty, DIFFICULTIES)
          ? parsed.difficulty
          : "any",
    };
  } catch {
    return EMPTY_FILTERS;
  }
}

export function notifyStorage(): void {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function saveFavouriteIds(ids: string[]): void {
  window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids));
  notifyStorage();
}

export function saveFilters(filters: WorkoutFilters): void {
  window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  notifyStorage();
}

export function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

let favouriteCacheRaw: string | null = null;
let favouriteCache: string[] = [];

export function getFavouriteSnapshot(): string[] {
  const raw = window.localStorage.getItem(FAVOURITES_KEY);
  if (raw === favouriteCacheRaw) return favouriteCache;
  favouriteCacheRaw = raw;
  favouriteCache = parseFavouriteIds(raw);
  return favouriteCache;
}

const EMPTY_FAVOURITES: string[] = [];

export function getFavouriteServerSnapshot(): string[] {
  return EMPTY_FAVOURITES;
}

let filterCacheRaw: string | null = "__unset__";
let filterCache: WorkoutFilters = EMPTY_FILTERS;

export function getFilterSnapshot(): WorkoutFilters {
  const raw = window.localStorage.getItem(FILTERS_KEY);
  if (raw === filterCacheRaw) return filterCache;
  filterCacheRaw = raw;
  filterCache = parseFilters(raw);
  return filterCache;
}

export function getFilterServerSnapshot(): WorkoutFilters {
  return EMPTY_FILTERS;
}

let lastWorkoutCache: string | null = "__unset__";

export function getLastWorkoutSnapshot(): string | null {
  const raw = window.localStorage.getItem(LAST_WORKOUT_KEY);
  if (raw === lastWorkoutCache) return lastWorkoutCache;
  lastWorkoutCache = raw;
  return raw;
}

export function getLastWorkoutServerSnapshot(): string | null {
  return null;
}

export function saveLastWorkoutId(id: string | null): void {
  if (id) {
    window.localStorage.setItem(LAST_WORKOUT_KEY, id);
  } else {
    window.localStorage.removeItem(LAST_WORKOUT_KEY);
  }
  lastWorkoutCache = id;
  notifyStorage();
}

function cookieIsUnlocked(): boolean {
  return document.cookie.split("; ").some((part) => {
    const [name, value] = part.split("=");
    return name === UNLOCK_COOKIE && value === UNLOCK_VALUE;
  });
}

function writeUnlockCookie(): void {
  document.cookie = [
    `${UNLOCK_COOKIE}=${UNLOCK_VALUE}`,
    "Path=/",
    `Max-Age=${UNLOCK_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ].join("; ");
}

export function getUnlockSnapshot(): boolean {
  const stored = window.localStorage.getItem(UNLOCK_STORAGE_KEY) === UNLOCK_VALUE;
  return stored || cookieIsUnlocked();
}

export function getUnlockServerSnapshot(): boolean {
  return false;
}

export function persistUnlock(): void {
  window.localStorage.setItem(UNLOCK_STORAGE_KEY, UNLOCK_VALUE);
  writeUnlockCookie();
  notifyStorage();
}
