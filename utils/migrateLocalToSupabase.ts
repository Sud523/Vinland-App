/**
 * One-time upload of legacy AsyncStorage data after the user signs in.
 */
import { replaceFullJournal } from './supabase/journalRemote';
import { replaceSavedWorkouts } from './supabase/workoutsRemote';
import { supabase } from './supabase';
import {
  clearLegacyStorageKeys,
  loadLegacyCheatMealForMigration,
  loadLegacyProfileKeysForMigration,
  loadLocalJournalForMigration,
  loadLocalSavedWorkoutsForMigration,
} from './storage';

export async function migrateLocalToRemote(userId: string): Promise<void> {
  const days = await loadLocalJournalForMigration();
  const workouts = await loadLocalSavedWorkoutsForMigration();
  const legacy = await loadLegacyProfileKeysForMigration();
  const cheat = await loadLegacyCheatMealForMigration();

  const hasJournal = days.length > 0;
  const hasWorkouts = workouts.length > 0;
  const hasProfile =
    legacy.displayName != null ||
    legacy.profilePrefs != null ||
    legacy.onboardingComplete ||
    legacy.weightGoal != null;
  const hasCheat = cheat != null;

  if (hasJournal) {
    await replaceFullJournal(userId, days);
  }
  if (hasWorkouts) {
    await replaceSavedWorkouts(userId, workouts);
  }

  const patch: Record<string, unknown> = {};
  if (legacy.displayName != null) {
    patch.display_name = legacy.displayName;
  }
  if (legacy.profilePrefs != null) {
    patch.workouts_per_week = legacy.profilePrefs.workoutsPerWeek;
    patch.activity_level = legacy.profilePrefs.activityLevel;
    patch.daily_calorie_goal = legacy.profilePrefs.dailyCalorieGoal;
  }
  if (legacy.onboardingComplete) {
    patch.onboarding_complete = true;
  }
  if (legacy.weightGoal != null) {
    patch.weight_goal_mode = legacy.weightGoal.mode;
    patch.baseline_weight_lb = legacy.weightGoal.baselineWeightLb;
    patch.baseline_date = legacy.weightGoal.baselineDateKey;
  }
  if (cheat != null) {
    patch.cheat_meal_week_start_monday = cheat.weekStartMonday;
    patch.cheat_meal_used = cheat.used;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) {
      throw error;
    }
  }

  if (hasJournal || hasWorkouts || hasProfile || hasCheat) {
    await clearLegacyStorageKeys();
  }
}
