import type { ExerciseDefinition } from '../types';

export type WorkoutTimerState = {
  exercise: ExerciseDefinition;
  running: boolean;
  finished: boolean;
  segment: 'work' | 'rest';
  currentSetIndex: number;
  currentPhaseIndex: number;
  secondsLeft: number;
};

export function isTimedExercise(
  ex: ExerciseDefinition | undefined | null,
): ex is ExerciseDefinition {
  if (ex == null || ex.timeBased !== true) {
    return false;
  }
  const phases = ex.workingPhases;
  if (!Array.isArray(phases) || phases.length === 0) {
    return false;
  }
  return phases.every((p) => Number(p.durationSeconds) > 0);
}

export function createWorkoutTimerState(ex: ExerciseDefinition): WorkoutTimerState {
  const phases = ex.workingPhases;
  const first = phases[0];
  return {
    exercise: ex,
    running: false,
    finished: false,
    segment: 'work',
    currentSetIndex: 0,
    currentPhaseIndex: 0,
    secondsLeft: Math.max(1, first.durationSeconds),
  };
}

/** One second elapsed while running. */
export function workoutTimerTick(state: WorkoutTimerState): WorkoutTimerState {
  if (!state.running || state.finished) {
    return state;
  }
  if (state.secondsLeft > 1) {
    return { ...state, secondsLeft: state.secondsLeft - 1 };
  }
  return advanceSegment(state);
}

function advanceSegment(state: WorkoutTimerState): WorkoutTimerState {
  const ex = state.exercise;
  const phases = ex.workingPhases;
  const sets = Math.max(1, ex.sets);
  const rest = ex.restSeconds ?? 0;

  if (state.segment === 'work') {
    if (state.currentPhaseIndex < phases.length - 1) {
      const ni = state.currentPhaseIndex + 1;
      return {
        ...state,
        currentPhaseIndex: ni,
        secondsLeft: Math.max(1, phases[ni].durationSeconds),
      };
    }
    const onLastSet = state.currentSetIndex >= sets - 1;
    if (onLastSet) {
      return { ...state, running: false, finished: true, secondsLeft: 0 };
    }
    if (rest > 0) {
      return {
        ...state,
        segment: 'rest',
        secondsLeft: Math.max(1, rest),
      };
    }
    const nextSet = state.currentSetIndex + 1;
    return {
      ...state,
      currentSetIndex: nextSet,
      currentPhaseIndex: 0,
      segment: 'work',
      secondsLeft: Math.max(1, phases[0].durationSeconds),
    };
  }

  const nextSet = state.currentSetIndex + 1;
  return {
    ...state,
    segment: 'work',
    currentSetIndex: nextSet,
    currentPhaseIndex: 0,
    secondsLeft: Math.max(1, phases[0].durationSeconds),
  };
}

/** Full duration of the current work or rest block (for progress UI). */
export function getSegmentDurationSeconds(state: WorkoutTimerState): number {
  if (state.finished) {
    return 1;
  }
  if (state.segment === 'rest') {
    return Math.max(1, state.exercise.restSeconds ?? 0);
  }
  const phase = state.exercise.workingPhases[state.currentPhaseIndex];
  return Math.max(1, phase?.durationSeconds ?? 1);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
