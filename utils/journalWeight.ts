/**
 * Helpers for finding the most recent weight entry in the journal.
 * Used by Stats and by `commitWeightGoalForMode` when establishing baselines.
 */
import type { Day } from '../types';

/** Most recent journal day with a weight entry (by date key, newest first). */
export function getLatestWeightEntry(
  days: Day[],
): { dateKey: string; weight: number } | null {
  const withW = days.filter(
    (d) => d.weight != null && Number.isFinite(d.weight) && (d.weight as number) > 0,
  );
  if (withW.length === 0) {
    return null;
  }
  withW.sort((a, b) => b.date.localeCompare(a.date));
  const d = withW[0];
  return { dateKey: d.date, weight: d.weight as number };
}
