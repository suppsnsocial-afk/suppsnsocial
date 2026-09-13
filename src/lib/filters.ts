import type { DurationBand, Workout, WorkoutFilters } from "./types";

export function durationBand(minutes: number): DurationBand {
  if (minutes < 20) return "under-20";
  if (minutes <= 30) return "20-30";
  if (minutes <= 45) return "30-45";
  return "45-plus";
}

export function formatDuration(minutes: number): string {
  return minutes === 1 ? "1 min" : `${minutes} mins`;
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

export function hasActiveFilters(filters: WorkoutFilters): boolean {
  return Object.values(filters).some((value) => value !== "any");
}

export function pickWorkout(
  workouts: Workout[],
  filters: WorkoutFilters,
  excludeId?: string,
): Workout | null {
  const pool = filterWorkouts(workouts, filters);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const withoutLast = excludeId ? pool.filter((workout) => workout.id !== excludeId) : pool;
  const choices = withoutLast.length > 0 ? withoutLast : pool;
  const index = Math.floor(Math.random() * choices.length);
  return choices[index] ?? null;
}
