import type { Day } from '../types';

import { localDateKey } from './date';

export type StatsSummary = {
  daysLogged: number;
  daysWithActivity: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
  avgWeight: number | null;
  bestStreak: number;
  weightEntries: number;
};

export function computeStats(days: Day[]): StatsSummary {
  let totalTasks = 0;
  let completedTasks = 0;
  const weights: number[] = [];
  let daysWithActivity = 0;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const d of sorted) {
    const n = d.tasks.length;
    const c = d.tasks.filter((t) => t.completed).length;
    totalTasks += n;
    completedTasks += c;
    if (d.weight != null && Number.isFinite(d.weight)) {
      weights.push(d.weight);
    }
    if (n > 0 || d.weight != null) {
      daysWithActivity += 1;
    }
  }

  const completionPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const avgWeight =
    weights.length > 0
      ? weights.reduce((a, b) => a + b, 0) / weights.length
      : null;

  let streak = 0;
  let bestStreak = 0;
  for (const d of sorted) {
    const anyDone = d.tasks.some((t) => t.completed);
    if (anyDone) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }

  return {
    daysLogged: days.length,
    daysWithActivity,
    totalTasks,
    completedTasks,
    completionPct,
    avgWeight,
    bestStreak,
    weightEntries: weights.length,
  };
}

/**
 * Consecutive days with ≥1 completed task. If today has none yet, counts backward
 * from yesterday so the streak doesn’t drop to zero before you train.
 */
export function currentWorkoutStreak(days: Day[], now: Date = new Date()): number {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const hasCompletedWork = (key: string): boolean => {
    const day = byDate.get(key);
    return day != null && day.tasks.some((t) => t.completed);
  };

  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = localDateKey(d);
  if (!hasCompletedWork(todayKey)) {
    d.setDate(d.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = localDateKey(d);
    if (!hasCompletedWork(key)) {
      break;
    }
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Consecutive calendar days (starting from today backward) where the user marked
 * hitting their calorie goal. Stops at first day without a hit or missing day row.
 */
export function calorieGoalHitStreak(days: Day[], now: Date = new Date()): number {
  let count = 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (true) {
    const key = localDateKey(d);
    const day = days.find((x) => x.date === key);
    if (day?.calorieGoalHit === true) {
      count += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}
