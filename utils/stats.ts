/**
 * Read-only analytics over `Day[]`: task completion aggregates, workout streak logic,
 * calorie-goal streaks, and cleanup of abandoned "workout in progress" flags.
 */
import type { Day } from '../types';

import { localDateKey } from './date';
import { isWorkoutSectionHeader, taskCountsTowardDailyProgress } from './workouts';

/** Format seconds as HH:MM:SS for timers and averages. */
export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Clears `workoutStartedAtMs` on days strictly before today so abandoned sessions
 * don't show as in-progress forever.
 */
export function clearStaleWorkoutInProgress(days: Day[], now: Date = new Date()): Day[] {
  const todayKey = localDateKey(now);
  return days.map((d) => {
    if (d.date >= todayKey || d.workoutStartedAtMs == null) {
      return d;
    }
    return { ...d, workoutStartedAtMs: undefined };
  });
}

/** Sums all recorded ended-session durations and counts sessions for averaging. */
function collectWorkoutSessionSeconds(days: Day[]): { sum: number; count: number } {
  let sum = 0;
  let count = 0;
  for (const d of days) {
    const arr = d.workoutSessionDurationsSeconds;
    if (!Array.isArray(arr)) {
      continue;
    }
    for (const sec of arr) {
      if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
        sum += sec;
        count += 1;
      }
    }
  }
  return { sum, count };
}

/**
 * A day “counts” for streaks when every exercise that affects progress/stats is
 * completed. Optional-only days don’t advance streak from optional checkboxes.
 * Legacy tasks (no structured exercise) still behave like required work.
 */
export function dayQualifiesForStreak(day: Day | undefined): boolean {
  if (!day) {
    return false;
  }
  if (day.restDay === true) {
    return true;
  }
  const required = day.tasks.filter(taskCountsTowardDailyProgress);
  if (required.length > 0) {
    return required.every((t) => t.completed);
  }
  const nonHeader = day.tasks.filter((t) => !isWorkoutSectionHeader(t.name));
  if (nonHeader.length === 0) {
    return false;
  }
  const onlyOptional =
    nonHeader.length > 0 &&
    nonHeader.every((t) => t.exercise != null && t.exercise.optional === true);
  if (onlyOptional) {
    return false;
  }
  return nonHeader.some((t) => t.completed);
}

export type StatsSummary = {
  daysLogged: number;
  daysWithActivity: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
  avgWeight: number | null;
  bestStreak: number;
  weightEntries: number;
  /** Mean length (seconds) of all ended “Start workout” sessions across days, or null if none. */
  avgWorkoutSessionSeconds: number | null;
  workoutSessionCount: number;
};

/** Computes summary metrics over the full journal (sorts by date for streak scan). */
export function computeStats(days: Day[]): StatsSummary {
  let totalTasks = 0;
  let completedTasks = 0;
  const weights: number[] = [];
  let daysWithActivity = 0;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const d of sorted) {
    const counting = d.tasks.filter(taskCountsTowardDailyProgress);
    const n = counting.length;
    const c = counting.filter((t) => t.completed).length;
    totalTasks += n;
    completedTasks += c;
    if (d.weight != null && Number.isFinite(d.weight)) {
      weights.push(d.weight);
    }
    if (n > 0 || d.weight != null || d.restDay === true) {
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
    if (dayQualifiesForStreak(d)) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }

  const { sum: sessionSum, count: sessionCount } = collectWorkoutSessionSeconds(sorted);
  const avgWorkoutSessionSeconds =
    sessionCount > 0 ? sessionSum / sessionCount : null;

  return {
    daysLogged: days.length,
    daysWithActivity,
    totalTasks,
    completedTasks,
    completionPct,
    avgWeight,
    bestStreak,
    weightEntries: weights.length,
    avgWorkoutSessionSeconds,
    workoutSessionCount: sessionCount,
  };
}

/**
 * Consecutive days with ≥1 qualifying completed work (see `dayQualifiesForStreak`).
 * If today has not qualified yet, counts backward from yesterday so the streak
 * doesn’t drop to zero before you train.
 */
export function currentWorkoutStreak(days: Day[], now: Date = new Date()): number {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const hasCompletedWork = (key: string): boolean => {
    return dayQualifiesForStreak(byDate.get(key));
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
