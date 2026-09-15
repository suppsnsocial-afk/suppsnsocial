export const FOCUSES = [
  "full-body",
  "legs",
  "upper",
  "cardio",
  "core",
  "mobility",
] as const;

export const EQUIPMENT = ["bodyweight", "dumbbells", "gym"] as const;

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const DURATION_BANDS = ["under-20", "20-30", "30-45", "45-plus"] as const;

export type Focus = (typeof FOCUSES)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type DurationBand = (typeof DURATION_BANDS)[number];

export type Workout = {
  id: string;
  name: string;
  description: string;
  focus: Focus;
  durationMinutes: number;
  equipment: Equipment;
  difficulty: Difficulty;
  steps: string[];
};

export type WorkoutFilters = {
  focus: Focus | "any";
  duration: DurationBand | "any";
  equipment: Equipment | "any";
  difficulty: Difficulty | "any";
};

export const EMPTY_FILTERS: WorkoutFilters = {
  focus: "any",
  duration: "any",
  equipment: "any",
  difficulty: "any",
};

export const APP_MODES = ["workout", "meal"] as const;

export type AppMode = (typeof APP_MODES)[number];

export const MEAL_FOCUSES = [
  "high-protein",
  "batch-cook",
  "quick",
  "vegetarian",
  "budget",
  "recovery",
] as const;

export const MEAL_DIETS = ["omnivore", "vegetarian"] as const;

export const MEAL_KITCHENS = ["minimal", "hob", "oven", "hob-and-oven", "blender"] as const;

export type MealFocus = (typeof MEAL_FOCUSES)[number];
export type MealDiet = (typeof MEAL_DIETS)[number];
export type MealKitchen = (typeof MEAL_KITCHENS)[number];

export type MealPrep = {
  id: string;
  name: string;
  description: string;
  focus: MealFocus;
  diet: MealDiet;
  durationMinutes: number;
  servings: number;
  equipment: MealKitchen;
  difficulty: Difficulty;
  steps: string[];
  nutrition: MealNutrition;
};

/** Typical recipe estimates. All macros are per serving. */
export type MealNutrition = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  sugarG: number;
  saltG: number;
  servingWeightG: number;
  batchWeightG: number;
};

export type MealPrepFilters = {
  focus: MealFocus | "any";
  duration: DurationBand | "any";
  diet: MealDiet | "any";
  difficulty: Difficulty | "any";
};

export const EMPTY_MEAL_FILTERS: MealPrepFilters = {
  focus: "any",
  duration: "any",
  diet: "any",
  difficulty: "any",
};

export const FOCUS_LABELS: Record<Focus, string> = {
  "full-body": "Full body",
  legs: "Legs",
  upper: "Upper",
  cardio: "Cardio",
  core: "Core",
  mobility: "Mobility",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: "Bodyweight",
  dumbbells: "Dumbbells",
  gym: "Gym",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const DURATION_LABELS: Record<DurationBand, string> = {
  "under-20": "Under 20 mins",
  "20-30": "20–30 mins",
  "30-45": "30–45 mins",
  "45-plus": "45 mins+",
};

export const MEAL_FOCUS_LABELS: Record<MealFocus, string> = {
  "high-protein": "High protein",
  "batch-cook": "Batch cook",
  quick: "Quick",
  vegetarian: "Vegetarian",
  budget: "Budget",
  recovery: "Recovery",
};

export const MEAL_DIET_LABELS: Record<MealDiet, string> = {
  omnivore: "Meat & fish",
  vegetarian: "Vegetarian",
};

export const MEAL_KITCHEN_LABELS: Record<MealKitchen, string> = {
  minimal: "Minimal kit",
  hob: "Hob",
  oven: "Oven",
  "hob-and-oven": "Hob + oven",
  blender: "Blender",
};
