/**
 * Persistent data via Supabase (journal, workout library, weight goal, cheat meal).
 * Requires an authenticated session (see AuthProvider). Legacy AsyncStorage reads are
 * exposed only for one-time migration (LocalDataMigration).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Day, SavedWorkout } from '../types';
import { fetchFullJournal, replaceFullJournal } from './supabase/journalRemote';
import { fetchSavedWorkouts, replaceSavedWorkouts } from './supabase/workoutsRemote';
import { supabase } from './supabase';
import { normalizeSavedWorkout } from './workouts';

const STORAGE_KEY = '@vinland_days';
const SAVED_WORKOUTS_KEY = '@vinland_saved_workouts';
const CHEAT_MEAL_KEY = '@vinland_cheat_meal_week';
const WEIGHT_GOAL_KEY = '@vinland_weight_goal';
const DISPLAY_NAME_KEY = '@vinland_display_name';
const PROFILE_PREFS_KEY = '@vinland_profile_prefs';
const ONBOARDING_COMPLETE_KEY = '@vinland_onboarding_complete';

/** @deprecated Use UserPrefsContext onboarding step from Supabase profiles. */
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

export type WeightGoalState = {
  mode: WeightGoalMode;
  baselineWeightLb: number;
  baselineDateKey: string;
};

export type CheatMealWeekState = {
  weekStartMonday: string;
  used: boolean;
};

async function requireUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || user == null) {
    throw new Error('Not signed in');
  }
  return user.id;
}

/** Optional user id when session not ready (returns null). */
async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

export async function saveData(days: Day[]): Promise<void> {
  const uid = await requireUserId();
  await replaceFullJournal(uid, days);
}

export async function loadData(): Promise<Day[]> {
  const uid = await getUserId();
  if (uid == null) {
    return [];
  }
  return fetchFullJournal(uid);
}

export async function saveSavedWorkouts(workouts: SavedWorkout[]): Promise<void> {
  const uid = await requireUserId();
  await replaceSavedWorkouts(uid, workouts);
}

export async function loadSavedWorkouts(): Promise<SavedWorkout[]> {
  const uid = await getUserId();
  if (uid == null) {
    return [];
  }
  return fetchSavedWorkouts(uid);
}

export async function loadCheatMealState(currentMondayKey: string): Promise<CheatMealWeekState> {
  const uid = await getUserId();
  if (uid == null) {
    return { weekStartMonday: currentMondayKey, used: false };
  }

  const { data: row, error } = await supabase
    .from('profiles')
    .select('cheat_meal_week_start_monday, cheat_meal_used')
    .eq('id', uid)
    .maybeSingle();

  if (error || row == null) {
    return { weekStartMonday: currentMondayKey, used: false };
  }

  const storedMonday =
    row.cheat_meal_week_start_monday != null
      ? String(row.cheat_meal_week_start_monday).slice(0, 10)
      : null;

  if (storedMonday !== currentMondayKey) {
    const fresh: CheatMealWeekState = {
      weekStartMonday: currentMondayKey,
      used: false,
    };
    await saveCheatMealState(fresh);
    return fresh;
  }

  return {
    weekStartMonday: currentMondayKey,
    used: row.cheat_meal_used === true,
  };
}

export async function saveCheatMealState(state: CheatMealWeekState): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('profiles')
    .update({
      cheat_meal_week_start_monday: state.weekStartMonday,
      cheat_meal_used: state.used,
    })
    .eq('id', uid);
  if (error) {
    throw error;
  }
}

export async function loadWeightGoal(): Promise<WeightGoalState | null> {
  const uid = await getUserId();
  if (uid == null) {
    return null;
  }

  const { data: row, error } = await supabase
    .from('profiles')
    .select('weight_goal_mode, baseline_weight_lb, baseline_date')
    .eq('id', uid)
    .maybeSingle();

  if (error || row == null) {
    return null;
  }
  if (
    row.weight_goal_mode !== 'lose' &&
    row.weight_goal_mode !== 'gain' &&
    row.weight_goal_mode != null
  ) {
    return null;
  }
  if (
    row.weight_goal_mode == null ||
    row.baseline_weight_lb == null ||
    row.baseline_date == null
  ) {
    return null;
  }

  const dateKey =
    typeof row.baseline_date === 'string'
      ? row.baseline_date.slice(0, 10)
      : String(row.baseline_date).slice(0, 10);

  return {
    mode: row.weight_goal_mode,
    baselineWeightLb: row.baseline_weight_lb,
    baselineDateKey: dateKey,
  };
}

export async function saveWeightGoal(state: WeightGoalState): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('profiles')
    .update({
      weight_goal_mode: state.mode,
      baseline_weight_lb: state.baselineWeightLb,
      baseline_date: state.baselineDateKey,
    })
    .eq('id', uid);
  if (error) {
    throw error;
  }
}

/** Raw journal snapshot from AsyncStorage — migration helper only. */
export async function loadLocalJournalForMigration(): Promise<Day[]> {
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

/** Raw workout library from AsyncStorage — migration helper only. */
export async function loadLocalSavedWorkoutsForMigration(): Promise<SavedWorkout[]> {
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

/** Legacy profile keys from AsyncStorage — merged once during migration. */
export async function loadLegacyProfileKeysForMigration(): Promise<{
  displayName: string | null;
  profilePrefs: ProfilePrefs | null;
  onboardingComplete: boolean;
  weightGoal: WeightGoalState | null;
}> {
  const [nameRaw, prefsRaw, onboardRaw, goalRaw] = await Promise.all([
    AsyncStorage.getItem(DISPLAY_NAME_KEY),
    AsyncStorage.getItem(PROFILE_PREFS_KEY),
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
    AsyncStorage.getItem(WEIGHT_GOAL_KEY),
  ]);

  const displayName =
    nameRaw != null && nameRaw.trim().length > 0 ? nameRaw.trim() : null;

  let profilePrefs: ProfilePrefs | null = null;
  if (prefsRaw != null) {
    try {
      const parsed = JSON.parse(prefsRaw) as Record<string, unknown>;
      if (
        parsed &&
        typeof parsed.workoutsPerWeek === 'number' &&
        typeof parsed.activityLevel === 'string' &&
        typeof parsed.dailyCalorieGoal === 'number'
      ) {
        profilePrefs = {
          workoutsPerWeek: parsed.workoutsPerWeek as number,
          activityLevel: parsed.activityLevel as ActivityLevel,
          dailyCalorieGoal: parsed.dailyCalorieGoal as number,
        };
      }
    } catch {
      //
    }
  }

  const onboardingComplete = onboardRaw === 'true';

  let weightGoal: WeightGoalState | null = null;
  if (goalRaw != null) {
    try {
      const parsed = JSON.parse(goalRaw) as Record<string, unknown>;
      if (
        parsed &&
        (parsed.mode === 'lose' || parsed.mode === 'gain') &&
        typeof parsed.baselineWeightLb === 'number' &&
        typeof parsed.baselineDateKey === 'string'
      ) {
        weightGoal = {
          mode: parsed.mode,
          baselineWeightLb: parsed.baselineWeightLb,
          baselineDateKey: parsed.baselineDateKey,
        };
      }
    } catch {
      //
    }
  }

  return { displayName, profilePrefs, onboardingComplete, weightGoal };
}

/** Legacy cheat meal blob — migration helper only. */
export async function loadLegacyCheatMealForMigration(): Promise<CheatMealWeekState | null> {
  const raw = await AsyncStorage.getItem(CHEAT_MEAL_KEY);
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      typeof (parsed as CheatMealWeekState).weekStartMonday === 'string' &&
      typeof (parsed as CheatMealWeekState).used === 'boolean'
    ) {
      return parsed as CheatMealWeekState;
    }
  } catch {
    //
  }
  return null;
}

/** Clears legacy AsyncStorage keys after successful cloud migration. */
export async function clearLegacyStorageKeys(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEY,
    SAVED_WORKOUTS_KEY,
    CHEAT_MEAL_KEY,
    WEIGHT_GOAL_KEY,
    DISPLAY_NAME_KEY,
    PROFILE_PREFS_KEY,
    ONBOARDING_COMPLETE_KEY,
    ONBOARDING_STEP_STORAGE_KEY,
  ]);
}
