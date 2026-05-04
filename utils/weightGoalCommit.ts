/**
 * Encapsulates committing a weight goal mode (cut/bulk): requires an existing weight log,
 * then snapshots baseline weight + date via `saveWeightGoal` (Supabase `profiles`).
 */
import type { Day } from '../types';
import { getLatestWeightEntry } from './journalWeight';
import { saveWeightGoal, type WeightGoalMode, type WeightGoalState } from './storage';

export type CommitWeightGoalResult =
  | { ok: true; state: WeightGoalState }
  | { ok: false; reason: 'no_weight' }
  | { ok: true; unchanged: true };

/**
 * When switching lose/gain mode, pins baseline to latest logged weight.
 * If mode unchanged, returns `unchanged` without IO.
 * If no positive weight exists in `days`, returns `no_weight`.
 */
export async function commitWeightGoalForMode(
  mode: WeightGoalMode,
  days: Day[],
  current: WeightGoalState | null,
): Promise<CommitWeightGoalResult> {
  if (current != null && current.mode === mode) {
    return { ok: true, unchanged: true };
  }
  const latest = getLatestWeightEntry(days);
  if (!latest) {
    return { ok: false, reason: 'no_weight' };
  }
  const next: WeightGoalState = {
    mode,
    baselineWeightLb: latest.weight,
    baselineDateKey: latest.dateKey,
  };
  await saveWeightGoal(next);
  return { ok: true, state: next };
}
