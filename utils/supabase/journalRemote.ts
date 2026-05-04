/**
 * Maps journal_days / journal_tasks ↔ domain Day[] (types/index.ts).
 */
import type { Day, ExerciseDefinition, Task } from '../../types';
import { supabase } from '../supabase';

type TaskRow = {
  sort_order: number;
  name: string;
  completed: boolean;
  duration_seconds: number | null;
  is_scheduled_workout_root: boolean;
  exercise: ExerciseDefinition | null;
};

type DayRow = {
  id: string;
  journal_date: string;
  weight_lb: number | null;
  rest_day: boolean;
  calorie_goal_hit: boolean;
  calories_over: number | null;
  workout_started_at_ms: number | null;
  workout_session_durations_seconds: number[] | null;
  journal_tasks: TaskRow[] | null;
};

function formatJournalDate(v: string): string {
  return v.length >= 10 ? v.slice(0, 10) : v;
}

function rowToDay(row: DayRow): Day {
  const tasksRaw = row.journal_tasks ?? [];
  const sorted = [...tasksRaw].sort((a, b) => a.sort_order - b.sort_order);
  const tasks: Task[] = sorted.map((t) => {
    const task: Task = {
      name: t.name,
      completed: t.completed,
      isScheduledWorkoutRoot: t.is_scheduled_workout_root,
    };
    if (t.duration_seconds != null) {
      task.duration = t.duration_seconds;
    }
    if (t.exercise != null) {
      task.exercise = t.exercise;
    }
    return task;
  });

  const day: Day = {
    date: formatJournalDate(row.journal_date),
    tasks,
  };
  if (row.weight_lb != null) {
    day.weight = row.weight_lb;
  }
  if (row.rest_day) {
    day.restDay = true;
  }
  if (row.calorie_goal_hit) {
    day.calorieGoalHit = true;
  }
  if (row.calories_over != null) {
    day.caloriesOver = row.calories_over;
  }
  if (row.workout_started_at_ms != null) {
    day.workoutStartedAtMs = row.workout_started_at_ms;
  }
  if (row.workout_session_durations_seconds != null && row.workout_session_durations_seconds.length > 0) {
    day.workoutSessionDurationsSeconds = row.workout_session_durations_seconds;
  }
  return day;
}

export async function fetchFullJournal(userId: string): Promise<Day[]> {
  const { data, error } = await supabase
    .from('journal_days')
    .select(
      `
      id,
      journal_date,
      weight_lb,
      rest_day,
      calorie_goal_hit,
      calories_over,
      workout_started_at_ms,
      workout_session_durations_seconds,
      journal_tasks (
        sort_order,
        name,
        completed,
        duration_seconds,
        is_scheduled_workout_root,
        exercise
      )
    `,
    )
    .eq('user_id', userId)
    .order('journal_date', { ascending: true });

  if (error) {
    throw error;
  }
  const rows = (data ?? []) as DayRow[];
  return rows.map(rowToDay);
}

export async function replaceFullJournal(userId: string, days: Day[]): Promise<void> {
  const { error: delErr } = await supabase.from('journal_days').delete().eq('user_id', userId);
  if (delErr) {
    throw delErr;
  }
  if (days.length === 0) {
    return;
  }

  const dayRows = days.map((d) => ({
    user_id: userId,
    journal_date: d.date,
    weight_lb: d.weight ?? null,
    rest_day: d.restDay ?? false,
    calorie_goal_hit: d.calorieGoalHit ?? false,
    calories_over: d.caloriesOver ?? null,
    workout_started_at_ms: d.workoutStartedAtMs ?? null,
    workout_session_durations_seconds:
      d.workoutSessionDurationsSeconds != null && d.workoutSessionDurationsSeconds.length > 0
        ? d.workoutSessionDurationsSeconds
        : null,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from('journal_days')
    .insert(dayRows)
    .select('id,journal_date');

  if (insErr) {
    throw insErr;
  }

  const dateToId = new Map<string, string>();
  for (const r of inserted ?? []) {
    dateToId.set(formatJournalDate(r.journal_date as string), r.id as string);
  }

  const taskRows: {
    journal_day_id: string;
    sort_order: number;
    name: string;
    completed: boolean;
    duration_seconds: number | null;
    is_scheduled_workout_root: boolean;
    exercise: ExerciseDefinition | null;
  }[] = [];

  for (const d of days) {
    const dayId = dateToId.get(d.date);
    if (dayId == null) {
      continue;
    }
    d.tasks.forEach((t, i) => {
      taskRows.push({
        journal_day_id: dayId,
        sort_order: i,
        name: t.name,
        completed: t.completed,
        duration_seconds: t.duration ?? null,
        is_scheduled_workout_root: t.isScheduledWorkoutRoot ?? false,
        exercise: t.exercise ?? null,
      });
    });
  }

  if (taskRows.length > 0) {
    const { error: tErr } = await supabase.from('journal_tasks').insert(taskRows);
    if (tErr) {
      throw tErr;
    }
  }
}
