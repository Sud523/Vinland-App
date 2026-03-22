/** One interval during “time working” (e.g. hard, light). */
export type TimePhase = {
  label: string;
  durationSeconds: number;
};

/** One interval during distance-based cardio (miles per block). */
export type DistancePhase = {
  label: string;
  miles: number;
};

export type ExerciseKind = 'weighted' | 'cardio' | 'circuit';

/** Cardio: repeating intervals vs single distance + pace. */
export type CardioPattern = 'interval' | 'steady_distance';

/** Under cardio interval: timed blocks vs distance blocks (no timer app support). */
export type CardioIntervalMeasure = 'time' | 'distance';

/** Full exercise spec for saved workouts and scheduled tasks. */
export type ExerciseDefinition = {
  name: string;
  sets: number;
  /** Rep-based exercises; null when time-only. Ignored for display when repsToFailure. */
  reps: number | null;
  /** Rep-based only: perform each set to muscular failure instead of a fixed rep count. */
  repsToFailure?: boolean;
  timeBased: boolean;
  workingPhases: TimePhase[];
  /** Rest after each full round of working phases (between sets). */
  restSeconds: number | null;
  /** Optional note (e.g. target effort). */
  notes?: string;
  /** When true, completions don’t count toward daily progress or stats. */
  optional?: boolean;
  /** Defaults to weighted when omitted (legacy). */
  kind?: ExerciseKind;
  /** Cardio only. */
  cardioPattern?: CardioPattern;
  /** Cardio interval only. */
  cardioIntervalMeasure?: CardioIntervalMeasure;
  /** Distance-based interval rounds (miles per block). */
  distancePhases?: DistancePhase[];
  /** Steady cardio: total distance (mi). */
  distanceMiles?: number;
  /** Steady cardio: pace (free text, e.g. 8:30 / mi). */
  paceDescription?: string;
};

export type Task = {
  name: string;
  completed: boolean;
  duration?: number;
  /** Present when task was created from a structured exercise. */
  exercise?: ExerciseDefinition;
  /**
   * True only for the main `— Workout name —` row when scheduling from the library.
   * Sub-section rows (`— Warm up —`, etc.) omit this so Week swipe-delete keeps one block.
   */
  isScheduledWorkoutRoot?: boolean;
};

export type Day = {
  date: string;
  weight?: number;
  tasks: Task[];
  /** Locked until next calendar day once true. */
  calorieGoalHit?: boolean;
  /** Calories over daily goal (0 = on target). Meaningful when calorieGoalHit. */
  caloriesOver?: number;
  /**
   * Wall time (ms) when the user tapped Start workout for this calendar day.
   * Cleared when they tap End. Not restored after app restart mid-session is still same day.
   */
  workoutStartedAtMs?: number;
  /** Length in seconds of each completed workout session ended on this day. */
  workoutSessionDurationsSeconds?: number[];
};

/** Draft row in the Workouts screen editor before validation. */
export type ExerciseFormInput = {
  name: string;
  setsStr: string;
  repsStr: string;
  /** Rep-based only: true = reps until failure (no fixed count). */
  repsUntilFailure: boolean;
  timeBased: boolean;
  phases: { label: string; minutesStr: string }[];
  /** Distance interval blocks (miles). */
  distancePhases: { label: string; milesStr: string }[];
  restMinutesStr: string;
  notesStr: string;
  /** Exercise is optional for progress and stats. */
  optional: boolean;
  kind: ExerciseKind;
  cardioPattern: CardioPattern;
  cardioIntervalMeasure: CardioIntervalMeasure;
  /** Steady cardio distance (miles). */
  distanceMilesStr: string;
  /** Steady cardio pace description. */
  paceStr: string;
};

/** Reusable template saved from the Workouts tab. */
export type SavedWorkout = {
  id: string;
  title: string;
  /** Optional workout-level note (e.g. training focus). */
  description?: string;
  warmUp: ExerciseDefinition[];
  workout: ExerciseDefinition[];
  coolDown: ExerciseDefinition[];
  /** @deprecated Loaded from storage only; normalized into section arrays. */
  exercises?: ExerciseDefinition[];
};
