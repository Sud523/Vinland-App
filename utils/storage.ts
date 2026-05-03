/**
 * Single source of truth for AsyncStorage persistence.
 * All journal days, saved workouts, profile, onboarding, cheat meal, and weight-goal
 * keys are defined and accessed here. Callers screens/utils merge and validate domain rules.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Day, SavedWorkout } from '../types';
import { normalizeSavedWorkout } from './workouts';

const STORAGE_KEY = '@vinland_days';
const SAVED_WORKOUTS_KEY = '@vinland_saved_workouts';
const CHEAT_MEAL_KEY = '@vinland_cheat_meal_week';
const WEIGHT_GOAL_KEY = '@vinland_weight_goal';
const DISPLAY_NAME_KEY = '@vinland_display_name';
const PROFILE_PREFS_KEY = '@vinland_profile_prefs';
const ONBOARDING_COMPLETE_KEY = '@vinland_onboarding_complete';
/** Exported for UserPrefsContext hydration alongside other parallel loads. */
export const ONBOARDING_STEP_STORAGE_KEY = '@vinland_onboarding_step';

export type ActivityLevel = 'inactive' | 'active' | 'extremely_active';

export type ProfilePrefs = {
  workoutsPerWeek: number;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
};

export const DEFAULT_PROFILE_PREFS: ProfilePrefs = {
  workoutsPerWeek: 3,
  activityLevel: 'active',
  dailyCalorieGoal: 2200,
};

export type WeightGoalMode = 'lose' | 'gain';

/** Baseline is reset whenever the user sets or changes cut/bulk goal. */
export type WeightGoalState = {
  mode: WeightGoalMode;
  baselineWeightLb: number;
  baselineDateKey: string;
};

export type CheatMealWeekState = {
  weekStartMonday: string;
  used: boolean;
};

/** Replaces the entire journal array in storage (full snapshot pattern). */
export async function saveData(days: Day[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

/** Loads all calendar `Day` rows; returns [] if missing or corrupt JSON. */
export async function loadData(): Promise<Day[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Day[]) : [];
  } catch {
    return [];
  }
}

/** Persists the workout template library as a JSON array. */
export async function saveSavedWorkouts(workouts: SavedWorkout[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_WORKOUTS_KEY, JSON.stringify(workouts));
}

/**
 * Loads saved templates; each item is passed through `normalizeSavedWorkout`
 * so legacy shapes (e.g. flat `exercises`) upgrade safely.
 */
export async function loadSavedWorkouts(): Promise<SavedWorkout[]> {
  const raw = await AsyncStorage.getItem(SAVED_WORKOUTS_KEY);
  if (raw == null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((w) => normalizeSavedWorkout(w))
      .filter((w): w is SavedWorkout => w != null);
  } catch {
    return [];
  }
}

/**
 * Cheat meal flag for the ISO week starting Monday `currentMondayKey`.
 * If storage references a different week, resets `used` to false and writes the fresh state.
 */
export async function loadCheatMealState(
  currentMondayKey: string,
): Promise<CheatMealWeekState> {
  const raw = await AsyncStorage.getItem(CHEAT_MEAL_KEY);
  if (raw == null) {
    return { weekStartMonday: currentMondayKey, used: false };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      typeof (parsed as CheatMealWeekState).weekStartMonday === 'string' &&
      typeof (parsed as CheatMealWeekState).used === 'boolean'
    ) {
      const p = parsed as CheatMealWeekState;
      if (p.weekStartMonday !== currentMondayKey) {
        const fresh: CheatMealWeekState = {
          weekStartMonday: currentMondayKey,
          used: false,
        };
        await AsyncStorage.setItem(CHEAT_MEAL_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return p;
    }
  } catch {
    //
  }
  return { weekStartMonday: currentMondayKey, used: false };
}

/** Writes cheat meal consumption for the current week (one shot until Monday rollover). */
export async function saveCheatMealState(state: CheatMealWeekState): Promise<void> {
  await AsyncStorage.setItem(CHEAT_MEAL_KEY, JSON.stringify(state));
}

/** Returns null if unset or JSON does not match `WeightGoalState` schema. */
export async function loadWeightGoal(): Promise<WeightGoalState | null> {
  const raw = await AsyncStorage.getItem(WEIGHT_GOAL_KEY);
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') {
      return null;
    }
    const p = parsed as Record<string, unknown>;
    if (
      (p.mode !== 'lose' && p.mode !== 'gain') ||
      typeof p.baselineWeightLb !== 'number' ||
      !Number.isFinite(p.baselineWeightLb) ||
      typeof p.baselineDateKey !== 'string'
    ) {
      return null;
    }
    return {
      mode: p.mode,
      baselineWeightLb: p.baselineWeightLb,
      baselineDateKey: p.baselineDateKey,
    };
  } catch {
    return null;
  }
}

/** Stores cut/bulk baseline (latest weight snapshot at commit time). */
export async function saveWeightGoal(state: WeightGoalState): Promise<void> {
  await AsyncStorage.setItem(WEIGHT_GOAL_KEY, JSON.stringify(state));
}

/** Trimmed non-empty display name, or null if absent. */
export async function loadDisplayName(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
  if (raw == null) {
    return null;
  }
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

/** Saves user-visible name (trimmed). */
export async function saveDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}

/** Narrowing guard for activity level strings inside `loadProfilePrefs`. */
function isActivityLevel(v: unknown): v is ActivityLevel {
  return v === 'inactive' || v === 'active' || v === 'extremely_active';
}

/**
 * Loads workouts/week + activity + calorie goal blob with validation.
 * Returns null if corrupt; callers usually substitute DEFAULT_PROFILE_PREFS.
 */
export async function loadProfilePrefs(): Promise<ProfilePrefs | null> {
  const raw = await AsyncStorage.getItem(PROFILE_PREFS_KEY);
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') {
      return null;
    }
    const p = parsed as Record<string, unknown>;
    const w = p.workoutsPerWeek;
    const a = p.activityLevel;
    if (
      typeof w !== 'number' ||
      !Number.isInteger(w) ||
      w < 1 ||
      w > 7 ||
      !isActivityLevel(a)
    ) {
      return null;
    }
    const rawCal = p.dailyCalorieGoal;
    let dailyCalorieGoal = DEFAULT_PROFILE_PREFS.dailyCalorieGoal;
    if (
      typeof rawCal === 'number' &&
      Number.isFinite(rawCal) &&
      rawCal >= 800 &&
      rawCal <= 20000
    ) {
      dailyCalorieGoal = Math.round(rawCal);
    }
    return { workoutsPerWeek: w, activityLevel: a, dailyCalorieGoal };
  } catch {
    return null;
  }
}

/** Writes the full profile preferences object (replaces previous blob). */
export async function saveProfilePrefs(prefs: ProfilePrefs): Promise<void> {
  await AsyncStorage.setItem(PROFILE_PREFS_KEY, JSON.stringify(prefs));
}

/** True when `@vinland_onboarding_complete` is exactly the string `'true'`. */
export async function loadOnboardingComplete(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === 'true';
}

/** Persists onboarding completion as `'true'` or `'false'` string. */
export async function saveOnboardingComplete(complete: boolean): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, complete ? 'true' : 'false');
}

/** Current onboarding wizard step (0–4); invalid stored values clamp to 0. */
export async function loadOnboardingStep(): Promise<number> {
  const raw = await AsyncStorage.getItem(ONBOARDING_STEP_STORAGE_KEY);
  if (raw == null) {
    return 0;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 4) {
    return 0;
  }
  return n;
}

/** Persists which onboarding screen to resume. */
export async function saveOnboardingStep(step: number): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_STEP_STORAGE_KEY, String(step));
}

/** Clears resume pointer when onboarding finishes successfully. */
export async function clearOnboardingStep(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_STEP_STORAGE_KEY);
}
