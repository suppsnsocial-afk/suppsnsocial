import {
  UNLOCK_COOKIE,
  UNLOCK_COOKIE_MAX_AGE,
  UNLOCK_STORAGE_KEY,
  UNLOCK_VALUE,
} from "./unlock";
import {
  APP_MODES,
  DIFFICULTIES,
  DURATION_BANDS,
  EMPTY_FILTERS,
  EMPTY_MEAL_FILTERS,
  EQUIPMENT,
  FOCUSES,
  MEAL_DIETS,
  MEAL_FOCUSES,
  type AppMode,
  type MealPrepFilters,
  type WorkoutFilters,
} from "./types";

export const FAVOURITES_KEY = "todays-session:favourites";
export const PURCHASED_MEALS_KEY = "todays-session:purchased-meals";
export const FILTERS_KEY = "todays-session:filters";
export const MEAL_FILTERS_KEY = "todays-session:meal-filters";
export const LAST_WORKOUT_KEY = "todays-session:last";
export const LAST_MEAL_KEY = "todays-session:last-meal";
export const APP_MODE_KEY = "todays-session:mode";
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

export function parseMealFilters(raw: string | null): MealPrepFilters {
  if (!raw) return EMPTY_MEAL_FILTERS;
  try {
    const parsed = JSON.parse(raw) as Partial<MealPrepFilters>;
    return {
      focus:
        parsed.focus === "any" || isOneOf(parsed.focus, MEAL_FOCUSES) ? parsed.focus : "any",
      duration:
        parsed.duration === "any" || isOneOf(parsed.duration, DURATION_BANDS)
          ? parsed.duration
          : "any",
      diet: parsed.diet === "any" || isOneOf(parsed.diet, MEAL_DIETS) ? parsed.diet : "any",
      difficulty:
        parsed.difficulty === "any" || isOneOf(parsed.difficulty, DIFFICULTIES)
          ? parsed.difficulty
          : "any",
    };
  } catch {
    return EMPTY_MEAL_FILTERS;
  }
}

export function saveMealFilters(filters: MealPrepFilters): void {
  window.localStorage.setItem(MEAL_FILTERS_KEY, JSON.stringify(filters));
  notifyStorage();
}

export function parseAppMode(raw: string | null): AppMode {
  return isOneOf(raw, APP_MODES) ? raw : "workout";
}

export function saveAppMode(mode: AppMode): void {
  window.localStorage.setItem(APP_MODE_KEY, mode);
  appModeCacheRaw = mode;
  appModeCache = mode;
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

let mealFilterCacheRaw: string | null = "__unset__";
let mealFilterCache: MealPrepFilters = EMPTY_MEAL_FILTERS;

export function getMealFilterSnapshot(): MealPrepFilters {
  const raw = window.localStorage.getItem(MEAL_FILTERS_KEY);
  if (raw === mealFilterCacheRaw) return mealFilterCache;
  mealFilterCacheRaw = raw;
  mealFilterCache = parseMealFilters(raw);
  return mealFilterCache;
}

export function getMealFilterServerSnapshot(): MealPrepFilters {
  return EMPTY_MEAL_FILTERS;
}

let lastMealCache: string | null = "__unset__";

export function getLastMealSnapshot(): string | null {
  const raw = window.localStorage.getItem(LAST_MEAL_KEY);
  if (raw === lastMealCache) return lastMealCache;
  lastMealCache = raw;
  return raw;
}

export function getLastMealServerSnapshot(): string | null {
  return null;
}

export function saveLastMealId(id: string | null): void {
  if (id) {
    window.localStorage.setItem(LAST_MEAL_KEY, id);
  } else {
    window.localStorage.removeItem(LAST_MEAL_KEY);
  }
  lastMealCache = id;
  notifyStorage();
}

let appModeCacheRaw: string | null = "__unset__";
let appModeCache: AppMode = "workout";

export function getAppModeSnapshot(): AppMode {
  const raw = window.localStorage.getItem(APP_MODE_KEY);
  if (raw === appModeCacheRaw) return appModeCache;
  appModeCacheRaw = raw;
  appModeCache = parseAppMode(raw);
  return appModeCache;
}

export function getAppModeServerSnapshot(): AppMode {
  return "workout";
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

let purchasedMealCacheRaw: string | null = null;
let purchasedMealCache: string[] = [];

export function getPurchasedMealSnapshot(): string[] {
  const raw = window.localStorage.getItem(PURCHASED_MEALS_KEY);
  if (raw === purchasedMealCacheRaw) return purchasedMealCache;
  purchasedMealCacheRaw = raw;
  purchasedMealCache = parseFavouriteIds(raw);
  return purchasedMealCache;
}

export function getPurchasedMealServerSnapshot(): string[] {
  return EMPTY_FAVOURITES;
}

export function savePurchasedMealIds(ids: string[]): void {
  window.localStorage.setItem(PURCHASED_MEALS_KEY, JSON.stringify(ids));
  purchasedMealCacheRaw = JSON.stringify(ids);
  purchasedMealCache = ids;
  notifyStorage();
}

export function persistPurchasedMeal(id: string): void {
  const current = getPurchasedMealSnapshot();
  if (current.includes(id)) return;
  savePurchasedMealIds([id, ...current]);
}
