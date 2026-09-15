import type { DurationBand, MealPrep, MealPrepFilters, Workout, WorkoutFilters } from "./types";

export function durationBand(minutes: number): DurationBand {
  if (minutes < 20) return "under-20";
  if (minutes <= 30) return "20-30";
  if (minutes <= 45) return "30-45";
  return "45-plus";
}

export function formatDuration(minutes: number): string {
  return minutes === 1 ? "1 min" : `${minutes} mins`;
}

export function formatServings(servings: number): string {
  return servings === 1 ? "1 serving" : `${servings} servings`;
}

export function matchesFilters(workout: Workout, filters: WorkoutFilters): boolean {
  if (filters.focus !== "any" && workout.focus !== filters.focus) return false;
  if (filters.equipment !== "any" && workout.equipment !== filters.equipment) {
    return false;
  }
  if (filters.difficulty !== "any" && workout.difficulty !== filters.difficulty) {
    return false;
  }
  if (filters.duration !== "any" && durationBand(workout.durationMinutes) !== filters.duration) {
    return false;
  }
  return true;
}

export function filterWorkouts(workouts: Workout[], filters: WorkoutFilters): Workout[] {
  return workouts.filter((workout) => matchesFilters(workout, filters));
}

export function hasActiveFilters(filters: WorkoutFilters | MealPrepFilters): boolean {
  return Object.values(filters).some((value) => value !== "any");
}

export function pickWorkout(
  workouts: Workout[],
  filters: WorkoutFilters,
  excludeId?: string,
): Workout | null {
  return pickFrom(filterWorkouts(workouts, filters), excludeId);
}

export function matchesMealFilters(meal: MealPrep, filters: MealPrepFilters): boolean {
  if (filters.focus !== "any" && meal.focus !== filters.focus) return false;
  if (filters.diet !== "any" && meal.diet !== filters.diet) return false;
  if (filters.difficulty !== "any" && meal.difficulty !== filters.difficulty) return false;
  if (filters.duration !== "any" && durationBand(meal.durationMinutes) !== filters.duration) {
    return false;
  }
  return true;
}

export function filterMealPreps(meals: MealPrep[], filters: MealPrepFilters): MealPrep[] {
  return meals.filter((meal) => matchesMealFilters(meal, filters));
}

export function pickMealPrep(
  meals: MealPrep[],
  filters: MealPrepFilters,
  excludeId?: string,
  purchasedIds?: readonly string[],
): MealPrep | null {
  const pool = filterMealPreps(meals, filters);
  if (purchasedIds) {
    const unbought = pool.filter(
      (meal) => !purchasedIds.includes(meal.id) && meal.id !== excludeId,
    );
    if (unbought.length > 0) return pickFrom(unbought);
  }
  return pickFrom(pool, excludeId);
}

function pickFrom<T extends { id: string }>(pool: T[], excludeId?: string): T | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0] ?? null;

  const withoutLast = excludeId ? pool.filter((item) => item.id !== excludeId) : pool;
  const choices = withoutLast.length > 0 ? withoutLast : pool;
  const index = Math.floor(Math.random() * choices.length);
  return choices[index] ?? null;
}
