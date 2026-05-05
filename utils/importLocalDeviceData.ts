/**
 * Merges legacy AsyncStorage snapshots into Supabase for the signed-in user.
 * Used when another device already set local_data_migrated_at so automatic migration skipped.
 *
 * Rules:
 * - Workouts: append locals whose `id` is not already in the cloud library.
 * - Journal: append local days whose calendar date has no row in the cloud yet (does not overwrite).
 */
import type { Day, SavedWorkout } from '../types';
import { fetchFullJournal, replaceFullJournal } from './supabase/journalRemote';
import { fetchSavedWorkouts, replaceSavedWorkouts } from './supabase/workoutsRemote';
import { loadLocalJournalForMigration, loadLocalSavedWorkoutsForMigration } from './storage';

export type ImportLocalDeviceResult = {
  workoutTemplatesAdded: number;
  journalDaysAdded: number;
  localWorkoutCount: number;
  localJournalDayCount: number;
};

function sortDaysByDate(days: Day[]): Day[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

export async function importMergeLocalDeviceData(userId: string): Promise<ImportLocalDeviceResult> {
  const localWorkouts = await loadLocalSavedWorkoutsForMigration();
  const localDays = await loadLocalJournalForMigration();

  const remoteWorkouts = await fetchSavedWorkouts(userId);
  const remoteIds = new Set(remoteWorkouts.map((w) => w.id));
  const workoutAdditions = localWorkouts.filter((w) => !remoteIds.has(w.id));
  const mergedWorkouts: SavedWorkout[] = [...remoteWorkouts, ...workoutAdditions];

  if (workoutAdditions.length > 0) {
    await replaceSavedWorkouts(userId, mergedWorkouts);
  }

  const remoteDays = await fetchFullJournal(userId);
  const remoteDateSet = new Set(remoteDays.map((d) => d.date));
  const journalAdditions = localDays.filter((d) => !remoteDateSet.has(d.date));
  const mergedDays = sortDaysByDate([...remoteDays, ...journalAdditions]);

  if (journalAdditions.length > 0) {
    await replaceFullJournal(userId, mergedDays);
  }

  return {
    workoutTemplatesAdded: workoutAdditions.length,
    journalDaysAdded: journalAdditions.length,
    localWorkoutCount: localWorkouts.length,
    localJournalDayCount: localDays.length,
  };
}
