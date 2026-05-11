/**
 * Pure transforms on `Day[]` for Statistics settings — resets inputs that Stats aggregates.
 */
import type { Day } from '../types';
import { taskCountsTowardDailyProgress } from './workouts';

export function clearCountableExerciseCheckmarks(days: Day[]): Day[] {
  return days.map((d) => ({
    ...d,
    tasks: d.tasks.map((t) =>
      taskCountsTowardDailyProgress(t) ? { ...t, completed: false } : t,
    ),
  }));
}

export function clearRestDayFlags(days: Day[]): Day[] {
  return days.map((d) => (d.restDay === true ? { ...d, restDay: false } : d));
}

export function clearAllBodyWeights(days: Day[]): Day[] {
  return days.map((d) => {
    if (d.weight == null) {
      return d;
    }
    const { weight: _w, ...rest } = d;
    return { ...rest } as Day;
  });
}

/** Matches Stats “Days with a log” (activity markers that make a day count). */
export function clearDaysWithLogTally(days: Day[]): Day[] {
  return clearCountableExerciseCheckmarks(clearAllBodyWeights(clearRestDayFlags(days)));
}

export function clearCalorieGoalMarks(days: Day[]): Day[] {
  return days.map((d) => {
    const next: Day = { ...d };
    delete next.calorieGoalHit;
    delete next.caloriesOver;
    return next;
  });
}

export function clearWorkoutSessionHistory(days: Day[]): Day[] {
  return days.map((d) => {
    const next: Day = { ...d };
    delete next.workoutStartedAtMs;
    delete next.workoutSessionDurationsSeconds;
    return next;
  });
}
