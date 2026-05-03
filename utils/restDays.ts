/**
 * Weekly rest-day budget: 7 minus target workouts/week from settings.
 * Rest days are counted per Mon–Sun week (same boundary as cheat meal).
 */
import type { Day } from '../types';

import { localDateKey, parseDateKeyLocal } from './date';

/** YYYY-MM-DD keys Monday…Sunday for the week starting `weekMondayKey`. */
export function weekDateKeysFromMonday(weekMondayKey: string): string[] {
  const start = parseDateKeyLocal(weekMondayKey);
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const x = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    keys.push(localDateKey(x));
  }
  return keys;
}

/** Slots available for rest days (0–7) given workouts-per-week target. */
export function restDaysAllowedPerWeek(workoutsPerWeek: number): number {
  const n = Math.min(7, Math.max(1, Math.round(workoutsPerWeek)));
  return Math.max(0, 7 - n);
}

/** How many days in this ISO week already have `restDay: true`. */
export function countRestDaysInWeek(days: Day[], weekMondayKey: string): number {
  let c = 0;
  for (const key of weekDateKeysFromMonday(weekMondayKey)) {
    const d = days.find((x) => x.date === key);
    if (d?.restDay === true) {
      c += 1;
    }
  }
  return c;
}

/**
 * Rest days marked this week excluding `dateKey` (so we can test if another day can toggle on).
 */
export function countRestDaysInWeekExcluding(
  days: Day[],
  weekMondayKey: string,
  excludeDateKey: string,
): number {
  let c = 0;
  for (const key of weekDateKeysFromMonday(weekMondayKey)) {
    if (key === excludeDateKey) {
      continue;
    }
    const d = days.find((x) => x.date === key);
    if (d?.restDay === true) {
      c += 1;
    }
  }
  return c;
}
