import type {
  CircuitStation,
  CircuitStationFormInput,
  DistancePhase,
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

export function emptyCircuitStationForm(): CircuitStationFormInput {
  return {
    name: '',
    repsStr: '10',
    repsUntilFailure: false,
    timeBased: false,
    phases: [],
  };
}

export function emptyExerciseForm(): ExerciseFormInput {
  return {
    name: '',
    setsStr: '3',
    repsStr: '10',
    repsUntilFailure: false,
    timeBased: false,
    phases: [],
    distancePhases: [],
    restMinutesStr: '',
    notesStr: '',
    optional: false,
    kind: 'weighted',
    cardioPattern: 'interval',
    cardioIntervalMeasure: 'time',
    distanceMilesStr: '',
    paceStr: '',
    circuitStations: [],
  };
}

/** Total exercises across saved workout sections. */
export function savedWorkoutExerciseCount(w: SavedWorkout): number {
  return w.warmUp.length + w.workout.length + w.coolDown.length;
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
        message: `Check exercise ${i + 1}: name, sets/reps, time blocks, or cardio fields.`,
      };
    }
    exercises.push(def);
  }
  return { ok: true, exercises };
}

export function formsToDefinitionsAllowEmpty(
  forms: ExerciseFormInput[],
  sectionLabel: string,
): { ok: true; exercises: ExerciseDefinition[] } | { ok: false; message: string } {
  if (forms.length === 0) {
    return { ok: true, exercises: [] };
  }
  const exercises: ExerciseDefinition[] = [];
  for (let i = 0; i < forms.length; i++) {
    const def = formToExerciseDefinition(forms[i]);
    if (!def) {
      return {
        ok: false,
        message: `Check ${sectionLabel}, exercise ${i + 1}: name, sets/reps, time blocks, or cardio fields.`,
      };
    }
    exercises.push(def);
  }
  return { ok: true, exercises };
}

export function sectionedFormsToDefinitions(
  warmUp: ExerciseFormInput[],
  workout: ExerciseFormInput[],
  coolDown: ExerciseFormInput[],
):
  | {
      ok: true;
      warmUp: ExerciseDefinition[];
      workout: ExerciseDefinition[];
      coolDown: ExerciseDefinition[];
    }
  | { ok: false; message: string } {
  const a = formsToDefinitionsAllowEmpty(warmUp, 'Warm up');
  if (!a.ok) {
    return a;
  }
  const b = formsToDefinitionsAllowEmpty(workout, 'Workout');
  if (!b.ok) {
    return b;
  }
  const c = formsToDefinitionsAllowEmpty(coolDown, 'Cool down');
  if (!c.ok) {
    return c;
  }
  const total = a.exercises.length + b.exercises.length + c.exercises.length;
  if (total === 0) {
    return { ok: false, message: 'Add at least one exercise in any section.' };
  }
  return {
    ok: true,
    warmUp: a.exercises,
    workout: b.exercises,
    coolDown: c.exercises,
  };
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

function parseRestSeconds(f: ExerciseFormInput): number | null {
  const restMin = parseFloat(String(f.restMinutesStr).replace(',', '.'));
  return Number.isFinite(restMin) && restMin > 0
    ? Math.round(restMin * 60)
    : null;
}

function weightedExerciseDefinition(
  f: ExerciseFormInput,
  name: string,
): ExerciseDefinition | null {
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
          kind: 'weighted',
          ...(f.optional ? { optional: true } : {}),
        },
        f.notesStr,
      );
    }
    const r = parseInt(f.repsStr, 10);
    if (!Number.isFinite(r) || r < 1) {
      return null;
    }
    return withExerciseNotes(
      {
        name,
        sets,
        reps: r,
        timeBased: false,
        workingPhases: [],
        restSeconds: null,
        kind: 'weighted',
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

  return withExerciseNotes(
    {
      name,
      sets,
      reps: null,
      timeBased: true,
      workingPhases: phases,
      restSeconds: parseRestSeconds(f),
      kind: 'weighted',
      ...(f.optional ? { optional: true } : {}),
    },
    f.notesStr,
  );
}

function circuitStationFormToDef(s: CircuitStationFormInput): CircuitStation | null {
  const stationName = s.name.trim();
  if (!stationName) {
    return null;
  }
  if (s.timeBased) {
    const phases: TimePhase[] = [];
    for (const p of s.phases) {
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
    return {
      name: stationName,
      timeBased: true,
      reps: null,
      workingPhases: phases,
    };
  }
  if (s.repsUntilFailure) {
    return {
      name: stationName,
      timeBased: false,
      reps: 1,
      repsToFailure: true,
      workingPhases: [],
    };
  }
  const r = parseInt(s.repsStr, 10);
  if (!Number.isFinite(r) || r < 1) {
    return null;
  }
  return {
    name: stationName,
    timeBased: false,
    reps: r,
    workingPhases: [],
  };
}

function circuitFormToDefinition(f: ExerciseFormInput): ExerciseDefinition | null {
  const name = f.name.trim();
  if (!name) {
    return null;
  }
  const rounds = Math.max(1, parseInt(f.setsStr, 10) || 1);
  const stationsIn = f.circuitStations ?? [];
  if (stationsIn.length === 0) {
    return null;
  }
  const stations: CircuitStation[] = [];
  for (const row of stationsIn) {
    const st = circuitStationFormToDef(row);
    if (!st) {
      return null;
    }
    stations.push(st);
  }
  return withExerciseNotes(
    {
      name,
      sets: rounds,
      reps: null,
      timeBased: false,
      workingPhases: [],
      restSeconds: null,
      kind: 'circuit',
      circuitStations: stations,
      ...(f.optional ? { optional: true } : {}),
    },
    f.notesStr,
  );
}

export function formToExerciseDefinition(
  f: ExerciseFormInput,
): ExerciseDefinition | null {
  const name = f.name.trim();
  if (!name) {
    return null;
  }

  if (f.kind === 'weighted') {
    return weightedExerciseDefinition(f, name);
  }

  if (f.kind === 'circuit') {
    return circuitFormToDefinition(f);
  }

  if (f.kind !== 'cardio') {
    return null;
  }

  if (f.cardioPattern === 'steady_distance') {
    const mi = parseFloat(String(f.distanceMilesStr).replace(',', '.'));
    if (!Number.isFinite(mi) || mi <= 0) {
      return null;
    }
    const pace = f.paceStr.trim();
    return withExerciseNotes(
      {
        name,
        sets: 1,
        reps: null,
        timeBased: false,
        workingPhases: [],
        restSeconds: null,
        kind: 'cardio',
        cardioPattern: 'steady_distance',
        distanceMiles: mi,
        ...(pace.length > 0 ? { paceDescription: pace } : {}),
        ...(f.optional ? { optional: true } : {}),
      },
      f.notesStr,
    );
  }

  if (f.cardioPattern !== 'interval') {
    return null;
  }

  const sets = Math.max(1, parseInt(f.setsStr, 10) || 1);

  if (f.cardioIntervalMeasure === 'time') {
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
    return withExerciseNotes(
      {
        name,
        sets,
        reps: null,
        timeBased: true,
        workingPhases: phases,
        restSeconds: parseRestSeconds(f),
        kind: 'cardio',
        cardioPattern: 'interval',
        cardioIntervalMeasure: 'time',
        ...(f.optional ? { optional: true } : {}),
      },
      f.notesStr,
    );
  }

  const dPhases: DistancePhase[] = [];
  for (const p of f.distancePhases) {
    const label = p.label.trim();
    const miles = parseFloat(String(p.milesStr).replace(',', '.'));
    if (!label || !Number.isFinite(miles) || miles <= 0) {
      continue;
    }
    dPhases.push({ label, miles });
  }
  if (dPhases.length === 0) {
    return null;
  }

  return withExerciseNotes(
    {
      name,
      sets,
      reps: null,
      timeBased: false,
      workingPhases: [],
      restSeconds: parseRestSeconds(f),
      kind: 'cardio',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'distance',
      distancePhases: dPhases,
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

function circuitStationToFormInput(s: CircuitStation): CircuitStationFormInput {
  if (s.timeBased) {
    let phases = s.workingPhases.map((p) => ({
      label: p.label,
      minutesStr: secondsToMinutesInputStr(p.durationSeconds),
    }));
    if (phases.length === 0) {
      phases = [{ label: '', minutesStr: '' }];
    }
    return {
      name: s.name,
      timeBased: true,
      phases,
      repsStr: '',
      repsUntilFailure: false,
    };
  }
  return {
    name: s.name,
    timeBased: false,
    phases: [],
    repsUntilFailure: s.repsToFailure === true,
    repsStr: s.repsToFailure ? '' : String(s.reps != null && s.reps >= 1 ? s.reps : 10),
  };
}

/** Populate the exercise editor from a saved definition. */
export function exerciseDefinitionToFormInput(
  ex: ExerciseDefinition,
): ExerciseFormInput {
  const baseOptional = ex.optional === true;
  const kind = ex.kind ?? 'weighted';

  if (kind === 'circuit') {
    const stations = ex.circuitStations;
    if (stations && stations.length > 0) {
      return {
        name: ex.name,
        setsStr: String(Math.max(1, ex.sets)),
        repsStr: '',
        repsUntilFailure: false,
        timeBased: false,
        phases: [],
        distancePhases: [],
        restMinutesStr: '',
        notesStr: ex.notes ?? '',
        optional: baseOptional,
        kind: 'circuit',
        cardioPattern: 'interval',
        cardioIntervalMeasure: 'time',
        distanceMilesStr: '',
        paceStr: '',
        circuitStations: stations.map(circuitStationToFormInput),
      };
    }
    const innerStation: CircuitStationFormInput = ex.timeBased
      ? {
          name: ex.name,
          timeBased: true,
          phases:
            ex.workingPhases.length > 0
              ? ex.workingPhases.map((p) => ({
                  label: p.label,
                  minutesStr: secondsToMinutesInputStr(p.durationSeconds),
                }))
              : [{ label: '', minutesStr: '' }],
          repsStr: '',
          repsUntilFailure: false,
        }
      : {
          name: ex.name,
          timeBased: false,
          phases: [],
          repsUntilFailure: ex.repsToFailure === true,
          repsStr:
            ex.repsToFailure === true
              ? ''
              : String(ex.reps != null && ex.reps >= 1 ? ex.reps : 10),
        };
    return {
      name: ex.name,
      setsStr: String(Math.max(1, ex.sets)),
      repsStr: '',
      repsUntilFailure: false,
      timeBased: false,
      phases: [],
      distancePhases: [],
      restMinutesStr: '',
      notesStr: ex.notes ?? '',
      optional: baseOptional,
      kind: 'circuit',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      distanceMilesStr: '',
      paceStr: '',
      circuitStations: [innerStation],
    };
  }

  if (kind === 'cardio' && ex.cardioPattern === 'steady_distance') {
    return {
      name: ex.name,
      setsStr: '1',
      repsStr: '',
      repsUntilFailure: false,
      timeBased: false,
      phases: [],
      distancePhases: [],
      restMinutesStr: '',
      notesStr: ex.notes ?? '',
      optional: baseOptional,
      kind: 'cardio',
      cardioPattern: 'steady_distance',
      cardioIntervalMeasure: 'time',
      distanceMilesStr:
        ex.distanceMiles != null && Number.isFinite(ex.distanceMiles)
          ? String(ex.distanceMiles)
          : '',
      paceStr: ex.paceDescription ?? '',
      circuitStations: [],
    };
  }

  if (
    kind === 'cardio' &&
    ex.cardioPattern === 'interval' &&
    ex.cardioIntervalMeasure === 'distance' &&
    ex.distancePhases &&
    ex.distancePhases.length > 0
  ) {
    let distancePhases = ex.distancePhases.map((p) => ({
      label: p.label,
      milesStr: String(p.miles),
    }));
    if (distancePhases.length === 0) {
      distancePhases = [{ label: '', milesStr: '' }];
    }
    return {
      name: ex.name,
      setsStr: String(Math.max(1, ex.sets)),
      repsStr: '',
      repsUntilFailure: false,
      timeBased: false,
      phases: [],
      distancePhases,
      restMinutesStr:
        ex.restSeconds != null && ex.restSeconds > 0
          ? secondsToMinutesInputStr(ex.restSeconds)
          : '',
      notesStr: ex.notes ?? '',
      optional: baseOptional,
      kind: 'cardio',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'distance',
      distanceMilesStr: '',
      paceStr: '',
      circuitStations: [],
    };
  }

  if (
    kind === 'cardio' &&
    ex.cardioPattern === 'interval' &&
    ex.cardioIntervalMeasure === 'time' &&
    ex.timeBased
  ) {
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
      distancePhases: [],
      restMinutesStr:
        ex.restSeconds != null && ex.restSeconds > 0
          ? secondsToMinutesInputStr(ex.restSeconds)
          : '',
      notesStr: ex.notes ?? '',
      optional: baseOptional,
      kind: 'cardio',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      distanceMilesStr: '',
      paceStr: '',
      circuitStations: [],
    };
  }

  if (!ex.timeBased) {
    const toFailure = ex.repsToFailure === true;
    return {
      name: ex.name,
      setsStr: String(Math.max(1, ex.sets)),
      repsStr: toFailure ? '' : ex.reps != null ? String(ex.reps) : '1',
      repsUntilFailure: toFailure,
      timeBased: false,
      phases: [],
      distancePhases: [],
      restMinutesStr: '',
      notesStr: ex.notes ?? '',
      optional: baseOptional,
      kind: 'weighted',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      distanceMilesStr: '',
      paceStr: '',
      circuitStations: [],
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
    distancePhases: [],
    restMinutesStr:
      ex.restSeconds != null && ex.restSeconds > 0
        ? secondsToMinutesInputStr(ex.restSeconds)
        : '',
    notesStr: ex.notes ?? '',
    optional: baseOptional,
    kind: 'weighted',
    cardioPattern: 'interval',
    cardioIntervalMeasure: 'time',
    distanceMilesStr: '',
    paceStr: '',
    circuitStations: [],
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
  const first =
    w.warmUp[0] ?? w.workout[0] ?? w.coolDown[0] ?? w.exercises?.[0];
  if (first?.name) {
    return first.name;
  }
  return 'Untitled workout';
}

/** Tasks appended to a day when scheduling a saved workout. */
export function savedWorkoutToTasks(w: SavedWorkout): Task[] {
  const tasks: Task[] = [];
  const t = w.title.trim();
  if (t) {
    tasks.push({
      name: `— ${t} —`,
      completed: false,
      isScheduledWorkoutRoot: true,
    });
  }
  const pushSection = (label: string, exercises: ExerciseDefinition[]) => {
    if (exercises.length === 0) {
      return;
    }
    tasks.push({ name: `— ${label} —`, completed: false });
    for (const ex of exercises) {
      tasks.push(exerciseToTask(ex));
    }
  };
  pushSection('Warm up', w.warmUp);
  pushSection('Workout', w.workout);
  pushSection('Cool down', w.coolDown);
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
  const usesRoot = tasks.some((t) => t.isScheduledWorkoutRoot === true);
  const segments: { start: number; end: number }[] = [];
  let i = 0;
  if (usesRoot) {
    while (i < tasks.length) {
      if (tasks[i].isScheduledWorkoutRoot === true) {
        const start = i;
        i += 1;
        while (i < tasks.length && tasks[i].isScheduledWorkoutRoot !== true) {
          i += 1;
        }
        segments.push({ start, end: i - 1 });
      } else {
        const start = i;
        while (
          i < tasks.length &&
          tasks[i].isScheduledWorkoutRoot !== true &&
          !isWorkoutSectionHeader(tasks[i].name)
        ) {
          i += 1;
        }
        if (i > start) {
          segments.push({ start, end: i - 1 });
        } else {
          i += 1;
        }
      }
    }
    return segments;
  }

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
  const kind = ex.kind ?? 'weighted';

  if (kind === 'cardio' && ex.cardioPattern === 'steady_distance') {
    const mi = ex.distanceMiles ?? 0;
    lines.push(`${mi} mi`);
    if (ex.paceDescription) {
      lines.push(`Pace: ${ex.paceDescription}`);
    }
    lines.push('Cardio · distance');
    return lines;
  }

  if (
    kind === 'cardio' &&
    ex.cardioPattern === 'interval' &&
    ex.cardioIntervalMeasure === 'distance' &&
    ex.distancePhases &&
    ex.distancePhases.length > 0
  ) {
    const setStr = `${ex.sets} set${ex.sets === 1 ? '' : 's'}`;
    lines.push(`${setStr} · distance intervals`);
    for (const p of ex.distancePhases) {
      lines.push(`${p.label}: ${p.miles} mi`);
    }
    if (ex.restSeconds != null && ex.restSeconds > 0) {
      lines.push(`Rest between sets: ${formatDuration(ex.restSeconds)}`);
    }
    return lines;
  }

  if (
    kind === 'cardio' &&
    ex.cardioPattern === 'interval' &&
    ex.cardioIntervalMeasure === 'time' &&
    ex.timeBased
  ) {
    const setStr = `${ex.sets} set${ex.sets === 1 ? '' : 's'}`;
    lines.push(`${setStr} · cardio · time intervals`);
    for (const p of ex.workingPhases) {
      lines.push(`${p.label}: ${formatDuration(p.durationSeconds)}`);
    }
    if (ex.restSeconds != null && ex.restSeconds > 0) {
      lines.push(`Rest between sets: ${formatDuration(ex.restSeconds)}`);
    }
    return lines;
  }

  if (kind === 'circuit' && ex.circuitStations && ex.circuitStations.length > 0) {
    const rStr = `${ex.sets} round${ex.sets === 1 ? '' : 's'}`;
    lines.push(`${rStr} · circuit`);
    for (const st of ex.circuitStations) {
      if (st.timeBased) {
        const parts = st.workingPhases.map(
          (p) => `${p.label} ${formatDuration(p.durationSeconds)}`,
        );
        lines.push(
          `${st.name}: ${parts.length > 0 ? parts.join(' · ') : 'time blocks'}`,
        );
      } else if (st.repsToFailure) {
        lines.push(`${st.name}: to failure`);
      } else {
        const r = st.reps ?? 0;
        lines.push(`${st.name}: ${r} rep${r === 1 ? '' : 's'}`);
      }
    }
    return lines;
  }

  const setLabel = kind === 'circuit' ? 'round' : 'set';
  const setStr = `${ex.sets} ${setLabel}${ex.sets === 1 ? '' : 's'}`;
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

function isDistancePhase(x: unknown): x is DistancePhase {
  return (
    x != null &&
    typeof x === 'object' &&
    typeof (x as DistancePhase).label === 'string' &&
    typeof (x as DistancePhase).miles === 'number' &&
    Number.isFinite((x as DistancePhase).miles)
  );
}

function isExerciseKind(
  x: unknown,
): x is 'weighted' | 'cardio' | 'circuit' {
  return x === 'weighted' || x === 'cardio' || x === 'circuit';
}

function isCircuitStation(x: unknown): x is CircuitStation {
  if (x == null || typeof x !== 'object') {
    return false;
  }
  const s = x as CircuitStation;
  return (
    typeof s.name === 'string' &&
    typeof s.timeBased === 'boolean' &&
    (s.reps === null || typeof s.reps === 'number') &&
    (s.repsToFailure === undefined || typeof s.repsToFailure === 'boolean') &&
    Array.isArray(s.workingPhases) &&
    s.workingPhases.every(isTimePhase)
  );
}

function isExerciseDefinition(x: unknown): x is ExerciseDefinition {
  if (x == null || typeof x !== 'object') {
    return false;
  }
  const e = x as ExerciseDefinition;
  const phasesOk =
    Array.isArray(e.workingPhases) && e.workingPhases.every(isTimePhase);
  const distOk =
    e.distancePhases === undefined ||
    (Array.isArray(e.distancePhases) && e.distancePhases.every(isDistancePhase));
  const circuitOk =
    e.circuitStations === undefined ||
    (Array.isArray(e.circuitStations) && e.circuitStations.every(isCircuitStation));
  return (
    typeof e.name === 'string' &&
    typeof e.sets === 'number' &&
    (e.reps === null || typeof e.reps === 'number') &&
    (e.repsToFailure === undefined || typeof e.repsToFailure === 'boolean') &&
    (e.optional === undefined || typeof e.optional === 'boolean') &&
    typeof e.timeBased === 'boolean' &&
    phasesOk &&
    distOk &&
    circuitOk &&
    (e.restSeconds === null || typeof e.restSeconds === 'number') &&
    (e.notes === undefined || typeof e.notes === 'string') &&
    (e.kind === undefined || isExerciseKind(e.kind)) &&
    (e.cardioPattern === undefined ||
      e.cardioPattern === 'interval' ||
      e.cardioPattern === 'steady_distance') &&
    (e.cardioIntervalMeasure === undefined ||
      e.cardioIntervalMeasure === 'time' ||
      e.cardioIntervalMeasure === 'distance') &&
    (e.distanceMiles === undefined || typeof e.distanceMiles === 'number') &&
    (e.paceDescription === undefined || typeof e.paceDescription === 'string')
  );
}

function parseExerciseDefinitionList(arr: unknown): ExerciseDefinition[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  const exercises: ExerciseDefinition[] = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      exercises.push(legacyStringToExercise(item));
    } else if (isExerciseDefinition(item)) {
      exercises.push(item);
    }
  }
  return exercises;
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

  const warmUp = parseExerciseDefinitionList(w.warmUp);
  let workout: ExerciseDefinition[];
  if (Array.isArray(w.workout)) {
    workout = parseExerciseDefinitionList(w.workout);
  } else if (Array.isArray(w.exercises)) {
    workout = parseExerciseDefinitionList(w.exercises);
  } else {
    return null;
  }
  const coolDown = parseExerciseDefinitionList(w.coolDown);

  const descRaw = w.description;
  const description =
    typeof descRaw === 'string' && descRaw.trim().length > 0
      ? descRaw.trim()
      : undefined;
  const base = { id: w.id, title, warmUp, workout, coolDown };
  return description != null ? { ...base, description } : base;
}
