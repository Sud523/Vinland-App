/** One interval during “time working” (e.g. hard, light). */
export type TimePhase = {
  label: string;
  durationSeconds: number;
};

/** Full exercise spec for saved workouts and scheduled tasks. */
export type ExerciseDefinition = {
  name: string;
  sets: number;
  /** Rep-based exercises; null when time-only. */
  reps: number | null;
  timeBased: boolean;
  workingPhases: TimePhase[];
  /** Rest after each full round of working phases (between sets). */
  restSeconds: number | null;
  /** Optional note (e.g. target effort). */
  notes?: string;
};

export type Task = {
  name: string;
  completed: boolean;
  duration?: number;
  /** Present when task was created from a structured exercise. */
  exercise?: ExerciseDefinition;
};

export type Day = {
  date: string;
  weight?: number;
  tasks: Task[];
  /** Locked until next calendar day once true. */
  calorieGoalHit?: boolean;
  /** Calories over daily goal (0 = on target). Meaningful when calorieGoalHit. */
  caloriesOver?: number;
};

/** Draft row in the Workouts screen editor before validation. */
export type ExerciseFormInput = {
  name: string;
  setsStr: string;
  repsStr: string;
  timeBased: boolean;
  phases: { label: string; minutesStr: string }[];
  restMinutesStr: string;
  notesStr: string;
};

/** Reusable template saved from the Workouts tab. */
export type SavedWorkout = {
  id: string;
  title: string;
  /** Optional workout-level note (e.g. training focus). */
  description?: string;
  exercises: ExerciseDefinition[];
};
