import type { Day } from '../types';
import { getLatestWeightEntry } from './journalWeight';
import { saveWeightGoal, type WeightGoalMode, type WeightGoalState } from './storage';

export type CommitWeightGoalResult =
  | { ok: true; state: WeightGoalState }
  | { ok: false; reason: 'no_weight' }
  | { ok: true; unchanged: true };

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
