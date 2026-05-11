/**
 * Interval timer for time-based exercises on today’s task list (audio chime; no journal writes).
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkoutTimerRing } from '../components/WorkoutTimerRing';
import { V } from '../constants/vinlandTheme';
import type { Day, ExerciseDefinition, Task } from '../types';
import { localDateKey, resolveTodayDay } from '../utils/date';
import { loadData } from '../utils/storage';
import {
  loadTimerChime,
  playTimerChime,
  playTimerEndChime,
  playTimerStartChime,
  unloadTimerChime,
} from '../utils/timerSound';
import { exerciseSummaryLines, isWorkoutSectionHeader } from '../utils/workouts';
import {
  createWorkoutTimerState,
  formatClock,
  getSegmentDurationSeconds,
  isTimedExercise,
  workoutTimerTick,
  type WorkoutTimerState,
} from '../utils/workoutTimer';

type TimedPick = {
  key: string;
  taskIndex: number;
  exercise: ExerciseDefinition;
  completed: boolean;
};

/** Flattens today’s tasks into selectable timed exercises for the interval runner. */
function collectTimedExercises(tasks: Task[]): TimedPick[] {
  const out: TimedPick[] = [];
  tasks.forEach((task, taskIndex) => {
    if (isWorkoutSectionHeader(task.name)) {
      return;
    }
    if (isTimedExercise(task.exercise)) {
      out.push({
        key: `${taskIndex}-${task.exercise.name}`,
        taskIndex,
        exercise: task.exercise,
        completed: task.completed,
      });
    }
  });
  return out;
}

export default function TimerScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerState, setTimerState] = useState<WorkoutTimerState | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  /** Seconds until the next block auto-starts after a segment ends (null = not in gap). */
  const [betweenCountdown, setBetweenCountdown] = useState<number | null>(null);

  const date = localDateKey(new Date());
  const today = useMemo(
    () => resolveTodayDay(days, new Date()).day,
    [days],
  );

  const timedOptions = useMemo(
    () => (today ? collectTimedExercises(today.tasks) : []),
    [today],
  );

  useEffect(() => {
    if (selectedKey == null) {
      return;
    }
    const pick = timedOptions.find((p) => p.key === selectedKey);
    if (pick?.completed) {
      setSelectedKey(null);
      setTimerState(null);
    }
  }, [timedOptions, selectedKey]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const loaded = await loadData();
          if (!cancelled) {
            setDays(loaded);
          }
        } catch {
          if (!cancelled) {
            setDays([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    void loadTimerChime();
    return () => {
      void unloadTimerChime();
    };
  }, []);

  const betweenActive = betweenCountdown != null;

  useEffect(() => {
    if (!betweenActive) {
      return;
    }
    const id = setInterval(() => {
      setBetweenCountdown((c) => {
        if (c == null || c <= 1) {
          void playTimerStartChime();
          setTimerState((s) =>
            s && !s.finished ? { ...s, running: true } : s,
          );
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [betweenActive]);

  useEffect(() => {
    if (!timerState?.running || betweenActive) {
      return;
    }
    const id = setInterval(() => {
      setTimerState((prev) => {
        if (!prev || !prev.running || prev.finished) {
          return prev;
        }
        const next = workoutTimerTick(prev);
        const finishedWorkout = next.finished && !prev.finished;
        const segmentAdvanced =
          !finishedWorkout &&
          prev.secondsLeft === 1 &&
          (prev.segment !== next.segment ||
            prev.currentSetIndex !== next.currentSetIndex ||
            prev.currentPhaseIndex !== next.currentPhaseIndex);

        if (finishedWorkout) {
          void playTimerEndChime();
          return next;
        }
        if (segmentAdvanced) {
          void playTimerChime();
          setBetweenCountdown(5);
          return { ...next, running: false };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerState?.running, betweenActive]);

  const pickExercise = (pick: TimedPick) => {
    if (pick.completed) {
      return;
    }
    setBetweenCountdown(null);
    setSelectedKey(pick.key);
    setTimerState(createWorkoutTimerState(pick.exercise));
  };

  const start = () => {
    void playTimerStartChime();
    setTimerState((s) => (s && !s.finished ? { ...s, running: true } : s));
  };

  const stop = () => {
    setBetweenCountdown(null);
    setTimerState((s) => (s ? { ...s, running: false } : s));
  };

  const reset = () => {
    setBetweenCountdown(null);
    setTimerState((s) =>
      s ? createWorkoutTimerState(s.exercise) : s,
    );
  };

  const headline = useMemo(() => {
    if (!timerState) {
      return null;
    }
    if (timerState.finished) {
      return 'Workout complete';
    }
    if (timerState.segment === 'rest') {
      return 'Rest';
    }
    const phase =
      timerState.exercise.workingPhases[timerState.currentPhaseIndex];
    return phase?.label ?? 'Work';
  }, [timerState]);

  const subline = useMemo(() => {
    if (!timerState || timerState.finished) {
      return null;
    }
    const setNum = timerState.currentSetIndex + 1;
    const total = Math.max(1, timerState.exercise.sets);
    const kind =
      timerState.segment === 'rest' ? 'Between sets' : 'Working';
    return `Set ${setNum} of ${total} · ${kind}`;
  }, [timerState]);

  const ringSyncKey = useMemo(() => {
    if (!timerState || timerState.finished) {
      return 'idle';
    }
    return `${timerState.segment}-${timerState.currentSetIndex}-${timerState.currentPhaseIndex}`;
  }, [timerState]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={V.runeGlow} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sub}>
          Pick a timed move from today’s plan. The timer runs work and rest in order
          for every set. Exercises you already checked off on Home show as done and
          can’t be started here.
        </Text>
        <Text style={styles.dateLine}>{date}</Text>

        {timedOptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No timed moves on today’s plan. On the Week tab, add a workout that
              includes exercises with a time target.
            </Text>
          </View>
        ) : (
          <View style={styles.pickSection}>
            <Text style={styles.sectionLabel}>Exercise</Text>
            {timedOptions.map((pick) => {
              const active = pick.key === selectedKey && !pick.completed;
              return (
                <Pressable
                  key={pick.key}
                  onPress={() => pickExercise(pick)}
                  disabled={pick.completed}
                  style={({ pressed }) => [
                    styles.pickRow,
                    active && styles.pickRowActive,
                    pick.completed && styles.pickRowDone,
                    pressed && !pick.completed && styles.pickRowPressed,
                  ]}
                >
                  <View style={styles.pickRowTop}>
                    <Text
                      style={[
                        styles.pickName,
                        pick.completed && styles.pickNameDone,
                      ]}
                    >
                      {pick.exercise.name}
                    </Text>
                    {pick.completed ? (
                      <Text style={styles.doneBadge}>Done</Text>
                    ) : null}
                  </View>
                  {exerciseSummaryLines(pick.exercise).slice(0, 3).map((line, i) => (
                    <Text
                      key={i}
                      style={[styles.pickMeta, pick.completed && styles.pickMetaDone]}
                    >
                      {line}
                    </Text>
                  ))}
                </Pressable>
              );
            })}
          </View>
        )}

        {timerState &&
        !timedOptions.find(
          (p) => p.key === selectedKey && p.completed,
        ) ? (
          <View style={styles.timerCard}>
            <Text style={styles.timerExerciseName}>
              {timerState.exercise.name}
            </Text>
            {headline ? (
              <Text
                style={[
                  styles.phaseTitle,
                  timerState.segment === 'rest' && styles.phaseRest,
                ]}
              >
                {headline}
              </Text>
            ) : null}
            {subline ? (
              <Text style={styles.phaseSub}>{subline}</Text>
            ) : null}

            {betweenCountdown != null ? (
              <WorkoutTimerRing
                secondsLeft={betweenCountdown}
                totalSeconds={5}
                centerLabel={String(betweenCountdown)}
                caption="Next block"
                variant="between"
                smoothProgress
                syncKey={`between-${betweenCountdown}`}
              />
            ) : timerState.finished ? (
              <WorkoutTimerRing
                secondsLeft={0}
                totalSeconds={1}
                centerLabel={formatClock(0)}
                caption="Complete"
                variant="done"
              />
            ) : (
              <WorkoutTimerRing
                secondsLeft={timerState.secondsLeft}
                totalSeconds={getSegmentDurationSeconds(timerState)}
                centerLabel={formatClock(timerState.secondsLeft)}
                variant={timerState.segment === 'rest' ? 'rest' : 'work'}
                smoothProgress={timerState.running}
                syncKey={ringSyncKey}
              />
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={start}
                disabled={
                  timerState.running ||
                  timerState.finished ||
                  betweenCountdown != null
                }
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnStart,
                  (timerState.running ||
                    timerState.finished ||
                    betweenCountdown != null) &&
                    styles.btnDisabled,
                  pressed &&
                    !(
                      timerState.running ||
                      timerState.finished ||
                      betweenCountdown != null
                    ) &&
                    styles.btnPressed,
                ]}
              >
                <Text style={styles.btnStartText}>Start</Text>
              </Pressable>
              <Pressable
                onPress={stop}
                disabled={!timerState.running && betweenCountdown == null}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnStop,
                  !timerState.running &&
                    betweenCountdown == null &&
                    styles.btnDisabled,
                  pressed &&
                    (timerState.running || betweenCountdown != null) &&
                    styles.btnPressed,
                ]}
              >
                <Text style={styles.btnStopText}>Stop</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={reset}
              disabled={timerState.running}
              style={({ pressed }) => [
                styles.resetBtn,
                timerState.running && styles.btnDisabled,
                pressed && !timerState.running && styles.btnPressed,
              ]}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 21,
    marginBottom: 8,
  },
  dateLine: {
    fontSize: 14,
    color: V.textDim,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    padding: 18,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
  },
  pickSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pickRow: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    padding: 14,
    marginBottom: 10,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
  },
  pickRowActive: {
    borderColor: V.border,
    borderWidth: V.outlineWidthActive,
  },
  pickRowDone: {
    backgroundColor: V.surfaceComplete,
    opacity: 1,
  },
  pickRowPressed: {
    opacity: 0.92,
  },
  pickRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  pickName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: V.text,
  },
  pickNameDone: {
    textDecorationLine: 'line-through',
    color: V.textTertiary,
  },
  doneBadge: {
    fontSize: 13,
    fontWeight: '400',
    color: V.onComplete,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pickMeta: {
    fontSize: 14,
    color: V.textDim,
    lineHeight: 20,
  },
  pickMetaDone: {
    color: V.textSecondary,
  },
  timerCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 22,
    marginBottom: 16,
  },
  timerExerciseName: {
    fontSize: 15,
    fontWeight: '400',
    color: V.textTertiary,
    marginBottom: 6,
  },
  phaseTitle: {
    fontSize: 26,
    fontWeight: '400',
    color: V.text,
  },
  phaseRest: {
    color: V.accentMuted,
  },
  phaseSub: {
    fontSize: 16,
    color: V.textDim,
    marginTop: 4,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: V.boxRadius,
    alignItems: 'center',
  },
  btnStart: {
    backgroundColor: V.runeGlow,
  },
  btnStartText: {
    color: V.bg,
    fontSize: 17,
    fontWeight: '400',
  },
  btnStop: {
    backgroundColor: V.surfaceComplete,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
  },
  btnStopText: {
    color: V.text,
    fontSize: 17,
    fontWeight: '400',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.88,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetBtnText: {
    fontSize: 16,
    color: V.link,
    fontWeight: '400',
  },
});
