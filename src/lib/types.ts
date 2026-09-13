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
