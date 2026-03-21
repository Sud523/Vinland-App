import type {
  ExerciseDefinition,
  ExerciseFormInput,
  SavedWorkout,
  Task,
  TimePhase,
} from '../types';

export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0s';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) {
    return `${m} min`;
  }
  return `${m}m ${s}s`;
}

export function emptyExerciseForm(): ExerciseFormInput {
  return {
    name: '',
    setsStr: '3',
    repsStr: '10',
    repsUntilFailure: false,
    timeBased: false,
    phases: [],
    restMinutesStr: '',
    notesStr: '',
    optional: false,
  };
}

export function formsToDefinitions(
  forms: ExerciseFormInput[],
): { ok: true; exercises: ExerciseDefinition[] } | { ok: false; message: string } {
  if (forms.length === 0) {
    return { ok: false, message: 'Add at least one exercise.' };
  }
  const exercises: ExerciseDefinition[] = [];
  for (let i = 0; i < forms.length; i++) {
    const def = formToExerciseDefinition(forms[i]);
    if (!def) {
      return {
        ok: false,
        message: `Check exercise ${i + 1}: name, sets/reps, or time blocks with labels and minutes.`,
      };
    }
    exercises.push(def);
  }
  return { ok: true, exercises };
}

function withExerciseNotes(
  def: ExerciseDefinition,
  notesStr: string | undefined,
): ExerciseDefinition {
  const t = notesStr?.trim();
  if (t) {
    return { ...def, notes: t };
  }
  return def;
}

export function formToExerciseDefinition(
  f: ExerciseFormInput,
): ExerciseDefinition | null {
  const name = f.name.trim();
  if (!name) {
    return null;
  }
  const sets = Math.max(1, parseInt(f.setsStr, 10) || 1);

  if (!f.timeBased) {
    if (f.repsUntilFailure) {
      return withExerciseNotes(
        {
          name,
          sets,
          reps: 1,
          repsToFailure: true,
          timeBased: false,
          workingPhases: [],
          restSeconds: null,
          ...(f.optional ? { optional: true } : {}),
        },
        f.notesStr,
      );
    }
    const r = parseInt(f.repsStr, 10);
    if (!Number.isFinite(r) || r < 1) {
      return null;
    }
    const reps = r;
    return withExerciseNotes(
      {
        name,
        sets,
        reps,
        timeBased: false,
        workingPhases: [],
        restSeconds: null,
        ...(f.optional ? { optional: true } : {}),
      },
      f.notesStr,
    );
  }

  const phases: TimePhase[] = [];
  for (const p of f.phases) {
    const label = p.label.trim();
    const min = parseFloat(String(p.minutesStr).replace(',', '.'));
    if (!label || !Number.isFinite(min) || min <= 0) {
      continue;
    }
    phases.push({
      label,
      durationSeconds: Math.round(min * 60),
    });
  }
  if (phases.length === 0) {
    return null;
  }

  const restMin = parseFloat(String(f.restMinutesStr).replace(',', '.'));
  const restSeconds =
    Number.isFinite(restMin) && restMin > 0
      ? Math.round(restMin * 60)
      : null;

  return withExerciseNotes(
    {
      name,
      sets,
      reps: null,
      timeBased: true,
      workingPhases: phases,
      restSeconds,
      ...(f.optional ? { optional: true } : {}),
    },
    f.notesStr,
  );
}

/** Round-trip seconds → minutes string for form fields. */
export function secondsToMinutesInputStr(seconds: number): string {
  const m = seconds / 60;
  if (Number.isInteger(m)) {
    return String(m);
  }
  const r = Math.round(m * 10) / 10;
  return String(r);
}

/** Populate the exercise editor from a saved definition. */
export function exerciseDefinitionToFormInput(
  ex: ExerciseDefinition,
): ExerciseFormInput {
  if (!ex.timeBased) {
    const toFailure = ex.repsToFailure === true;
    return {
      name: ex.name,
      setsStr: String(Math.max(1, ex.sets)),
      repsStr: toFailure ? '' : ex.reps != null ? String(ex.reps) : '1',
      repsUntilFailure: toFailure,
      timeBased: false,
      phases: [],
      restMinutesStr: '',
      notesStr: ex.notes ?? '',
      optional: ex.optional === true,
    };
  }
  let phases = ex.workingPhases.map((p) => ({
    label: p.label,
    minutesStr: secondsToMinutesInputStr(p.durationSeconds),
  }));
  if (phases.length === 0) {
    phases = [{ label: '', minutesStr: '' }];
  }
  return {
    name: ex.name,
    setsStr: String(Math.max(1, ex.sets)),
    repsStr: '',
    repsUntilFailure: false,
    timeBased: true,
    phases,
    restMinutesStr:
      ex.restSeconds != null && ex.restSeconds > 0
        ? secondsToMinutesInputStr(ex.restSeconds)
        : '',
    notesStr: ex.notes ?? '',
    optional: ex.optional === true,
  };
}

export function exerciseToTask(ex: ExerciseDefinition): Task {
  return {
    name: ex.name,
    completed: false,
    exercise: ex,
  };
}

export function savedWorkoutLabel(w: SavedWorkout): string {
  const t = w.title.trim();
  if (t) {
    return t;
  }
  if (w.exercises[0]?.name) {
    return w.exercises[0].name;
  }
  return 'Untitled workout';
}

/** Tasks appended to a day when scheduling a saved workout. */
export function savedWorkoutToTasks(w: SavedWorkout): Task[] {
  const tasks: Task[] = [];
  const t = w.title.trim();
  if (t) {
    tasks.push({ name: `— ${t} —`, completed: false });
  }
  for (const ex of w.exercises) {
    tasks.push(exerciseToTask(ex));
  }
  return tasks;
}

export function newSavedWorkoutId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Workout title row when scheduling (e.g. "— Push day —"). */
export function isWorkoutSectionHeader(name: string): boolean {
  return name.startsWith('—') && name.endsWith('—');
}

/** Tasks that count toward Home daily progress and aggregate stats (excludes optional exercises). */
export function taskCountsTowardDailyProgress(task: Task): boolean {
  if (isWorkoutSectionHeader(task.name)) {
    return false;
  }
  if (task.exercise?.optional === true) {
    return false;
  }
  return true;
}

/** Display title without em dashes (e.g. "— Push day —" → "Push day"). */
export function workoutSectionDisplayTitle(name: string): string {
  return name.replace(/—/g, '').trim();
}

/**
 * Split a day's tasks into scheduled workout blocks: either a titled block
 * (`— name —` plus following exercises) or a run of exercises with no header.
 */
export function getScheduledWorkoutSegments(
  tasks: Task[],
): { start: number; end: number }[] {
  const segments: { start: number; end: number }[] = [];
  let i = 0;
  while (i < tasks.length) {
    if (isWorkoutSectionHeader(tasks[i].name)) {
      const start = i;
      i += 1;
      while (i < tasks.length && !isWorkoutSectionHeader(tasks[i].name)) {
        i += 1;
      }
      segments.push({ start, end: i - 1 });
    } else {
      const start = i;
      while (i < tasks.length && !isWorkoutSectionHeader(tasks[i].name)) {
        i += 1;
      }
      segments.push({ start, end: i - 1 });
    }
  }
  return segments;
}

export function removeTaskIndexRange(
  tasks: Task[],
  start: number,
  end: number,
): Task[] {
  return tasks.filter((_, idx) => idx < start || idx > end);
}

/** Human-readable lines for lists (Home / Week). */
export function exerciseSummaryLines(ex: ExerciseDefinition): string[] {
  const lines: string[] = [];
  const setStr = `${ex.sets} set${ex.sets === 1 ? '' : 's'}`;
  if (!ex.timeBased) {
    if (ex.repsToFailure) {
      lines.push(`${setStr} · to failure`);
    } else {
      const r = ex.reps ?? 0;
      lines.push(`${setStr} · ${r} rep${r === 1 ? '' : 's'}`);
    }
    return lines;
  }
  lines.push(`${setStr} · time-based`);
  for (const p of ex.workingPhases) {
    lines.push(`${p.label}: ${formatDuration(p.durationSeconds)}`);
  }
  if (ex.restSeconds != null && ex.restSeconds > 0) {
    lines.push(`Rest between sets: ${formatDuration(ex.restSeconds)}`);
  }
  return lines;
}

function legacyStringToExercise(name: string): ExerciseDefinition {
  return {
    name,
    sets: 1,
    reps: 1,
    timeBased: false,
    workingPhases: [],
    restSeconds: null,
  };
}

function isTimePhase(x: unknown): x is TimePhase {
  return (
    x != null &&
    typeof x === 'object' &&
    typeof (x as TimePhase).label === 'string' &&
    typeof (x as TimePhase).durationSeconds === 'number' &&
    Number.isFinite((x as TimePhase).durationSeconds)
  );
}

function isExerciseDefinition(x: unknown): x is ExerciseDefinition {
  if (x == null || typeof x !== 'object') {
    return false;
  }
  const e = x as ExerciseDefinition;
  return (
    typeof e.name === 'string' &&
    typeof e.sets === 'number' &&
    (e.reps === null || typeof e.reps === 'number') &&
    (e.repsToFailure === undefined || typeof e.repsToFailure === 'boolean') &&
    (e.optional === undefined || typeof e.optional === 'boolean') &&
    typeof e.timeBased === 'boolean' &&
    Array.isArray(e.workingPhases) &&
    e.workingPhases.every(isTimePhase) &&
    (e.restSeconds === null || typeof e.restSeconds === 'number') &&
    (e.notes === undefined || typeof e.notes === 'string')
  );
}

/** Normalize a saved workout from storage (supports legacy string[] exercises). */
export function normalizeSavedWorkout(raw: unknown): SavedWorkout | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const w = raw as Record<string, unknown>;
  if (typeof w.id !== 'string') {
    return null;
  }
  const title = typeof w.title === 'string' ? w.title : '';
  if (!Array.isArray(w.exercises)) {
    return null;
  }
  const exercises: ExerciseDefinition[] = [];
  for (const item of w.exercises) {
    if (typeof item === 'string') {
      exercises.push(legacyStringToExercise(item));
    } else if (isExerciseDefinition(item)) {
      exercises.push(item);
    }
  }
  const descRaw = w.description;
  const description =
    typeof descRaw === 'string' && descRaw.trim().length > 0
      ? descRaw.trim()
      : undefined;
  return description != null
    ? { id: w.id, title, exercises, description }
    : { id: w.id, title, exercises };
}
