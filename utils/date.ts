import type { Day } from '../types';

/** Local calendar date as YYYY-MM-DD (avoids UTC drift from toISOString). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** UTC calendar date YYYY-MM-DD (matches legacy `toISOString().slice(0, 10)` saves). */
export function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type TodayResolve = {
  index: number;
  day: Day | undefined;
  /** Use when creating a new day if none exists (always local). */
  primaryDateKey: string;
};

/**
 * Find today's journal entry: prefer local calendar date, then UTC date key
 * (for data saved before localDateKey was used consistently).
 */
export function resolveTodayDay(days: Day[], now: Date = new Date()): TodayResolve {
  const primaryDateKey = localDateKey(now);
  let idx = days.findIndex((d) => d.date === primaryDateKey);
  if (idx >= 0) {
    return { index: idx, day: days[idx], primaryDateKey };
  }
  const utc = utcDateKey(now);
  if (utc !== primaryDateKey) {
    idx = days.findIndex((d) => d.date === utc);
    if (idx >= 0) {
      return { index: idx, day: days[idx], primaryDateKey };
    }
  }
  return { index: -1, day: undefined, primaryDateKey };
}

export function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split('-').map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

/** Monday 00:00 local for the week that contains `ref` (Mon–Sun weeks). */
export function startOfWeekMonday(ref: Date): Date {
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

/** YYYY-MM-DD of the Monday starting the current local week. */
export function mondayKeyForWeekContaining(now: Date = new Date()): string {
  return localDateKey(startOfWeekMonday(now));
}

/** True if `dateKey` (YYYY-MM-DD) is strictly before today's local calendar date. */
export function isPastLocalDateKey(
  dateKey: string,
  now: Date = new Date(),
): boolean {
  return dateKey < localDateKey(now);
}
