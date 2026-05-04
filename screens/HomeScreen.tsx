/**
 * Today dashboard: loads/creates journal row, workout session timer gates, task checklist,
 * calorie goal + cheat meal, and one-shot weight entry.
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionCheckRow } from '../components/NutritionCheckRow';
import { TaskItem } from '../components/TaskItem';
import { WeightInput } from '../components/WeightInput';
import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import type { Day, Task } from '../types';
import {
  localDateKey,
  mondayKeyForWeekContaining,
  parseDateKeyLocal,
  resolveTodayDay,
} from '../utils/date';
import {
  loadCheatMealState,
  loadData,
  saveCheatMealState,
  saveData,
} from '../utils/storage';
import {
  clearStaleWorkoutInProgress,
  currentWorkoutStreak,
  formatHms,
} from '../utils/stats';
import { isWorkoutSectionHeader, taskCountsTowardDailyProgress } from '../utils/workouts';

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { displayName, prefsLoaded, dailyCalorieGoal } = useUserPrefs();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [cheatMealUsed, setCheatMealUsed] = useState(false);
  const [caloriesOverDraft, setCaloriesOverDraft] = useState('0');
  /** Forces timer re-render every second while a workout is in progress. */
  const [workoutTick, setWorkoutTick] = useState(0);

  const date = localDateKey(new Date());
  const dateForDisplay = useMemo(() => parseDateKeyLocal(date), [date]);
  const weekday = dateForDisplay.toLocaleDateString(undefined, { weekday: 'long' });
  const calendarLine = dateForDisplay.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const { index: todayIndex, day: today } = useMemo(
    () => resolveTodayDay(days, new Date()),
    [days],
  );

  const streak = useMemo(() => currentWorkoutStreak(days, new Date()), [days]);

  const isRestDay = today?.restDay === true;

  const calorieHit = today?.calorieGoalHit === true;

  useEffect(() => {
    if (today?.calorieGoalHit) {
      setCaloriesOverDraft(String(today.caloriesOver ?? 0));
    }
  }, [today?.date, today?.calorieGoalHit, today?.caloriesOver]);

  const exerciseTasks = useMemo(
    () => today?.tasks.filter((t) => !isWorkoutSectionHeader(t.name)) ?? [],
    [today?.tasks],
  );
  const progressTasks = useMemo(
    () => exerciseTasks.filter(taskCountsTowardDailyProgress),
    [exerciseTasks],
  );
  const exercisesDone = progressTasks.filter((t) => t.completed).length;
  const exerciseTotal = progressTasks.length;
  const progressPct =
    exerciseTotal > 0 ? Math.round((exercisesDone / exerciseTotal) * 100) : 0;

  const workoutActive = today?.workoutStartedAtMs != null;
  const hasEndedWorkoutSessionToday =
    (today?.workoutSessionDurationsSeconds?.length ?? 0) > 0;
  const canToggleExercises =
    !isRestDay && (workoutActive || hasEndedWorkoutSessionToday);

  useEffect(() => {
    if (!workoutActive) {
      return;
    }
    const id = setInterval(() => {
      setWorkoutTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [workoutActive]);

  const elapsedWorkoutSeconds = useMemo(() => {
    if (!workoutActive || today?.workoutStartedAtMs == null) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - today.workoutStartedAtMs) / 1000));
  }, [workoutActive, today?.workoutStartedAtMs, workoutTick]);

  const persist = useCallback(async (next: Day[]) => {
    setDays(next);
    await saveData(next);
  }, []);

  const refreshCheatMeal = useCallback(async () => {
    const weekKey = mondayKeyForWeekContaining(new Date());
    const state = await loadCheatMealState(weekKey);
    setCheatMealUsed(state.used);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const now = new Date();
        const primaryDateKey = localDateKey(now);
        let next: Day[] | null = null;

        try {
          const loaded = await loadData();
          if (cancelled) {
            return;
          }
          const resolved = resolveTodayDay(loaded, now);
          next = [...loaded];
          if (resolved.index < 0) {
            next.push({ date: primaryDateKey, tasks: [] });
            try {
              await saveData(next);
            } catch {
              // Still show today in UI; persist can succeed on next edit
            }
          }
        } catch {
          if (cancelled) {
            return;
          }
          next = [{ date: primaryDateKey, tasks: [] }];
          try {
            await saveData(next);
          } catch {
            //
          }
        }

        if (cancelled || next == null) {
          return;
        }

        const cleaned = clearStaleWorkoutInProgress(next, now);
        let dirty = false;
        for (let i = 0; i < next.length; i += 1) {
          if (next[i].workoutStartedAtMs !== cleaned[i]?.workoutStartedAtMs) {
            dirty = true;
            break;
          }
        }
        if (dirty) {
          try {
            await saveData(cleaned);
          } catch {
            //
          }
        }
        setDays(cleaned);

        try {
          await refreshCheatMeal();
        } catch {
          //
        }
      })().finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [refreshCheatMeal]),
  );

  const handleCheatMealChange = async (used: boolean) => {
    if (cheatMealUsed && !used) {
      return;
    }
    const weekKey = mondayKeyForWeekContaining(new Date());
    setCheatMealUsed(used);
    await saveCheatMealState({ weekStartMonday: weekKey, used });
  };

  const handleCalorieGoalMark = () => {
    if (!today || todayIndex < 0 || today.calorieGoalHit) {
      return;
    }
    const next = [...days];
    next[todayIndex] = {
      ...today,
      calorieGoalHit: true,
      caloriesOver: 0,
    };
    void persist(next);
  };

  const commitCaloriesOver = () => {
    if (!today || todayIndex < 0 || !today.calorieGoalHit) {
      return;
    }
    const raw = caloriesOverDraft.replace(/\D/g, '');
    const n = raw === '' ? 0 : parseInt(raw, 10);
    const v = Number.isFinite(n) && n >= 0 ? n : 0;
    const next = [...days];
    next[todayIndex] = { ...today, caloriesOver: v };
    void persist(next);
  };

  const handleToggleTask = (taskIndex: number) => {
    if (!today || todayIndex < 0 || isRestDay) {
      return;
    }
    if (!canToggleExercises) {
      return;
    }
    const tasks = today.tasks.map((t, i) =>
      i === taskIndex ? { ...t, completed: !t.completed } : t,
    );
    const next = [...days];
    next[todayIndex] = { ...today, tasks };
    void persist(next);
  };

  const handleStartWorkout = () => {
    if (!today || todayIndex < 0 || today.workoutStartedAtMs != null || isRestDay) {
      return;
    }
    const next = [...days];
    next[todayIndex] = { ...today, workoutStartedAtMs: Date.now() };
    void persist(next);
  };

  const handleEndWorkout = () => {
    if (
      !today ||
      todayIndex < 0 ||
      today.workoutStartedAtMs == null ||
      isRestDay
    ) {
      return;
    }
    const durationSec = Math.max(
      0,
      Math.floor((Date.now() - today.workoutStartedAtMs) / 1000),
    );
    const prevDurations = today.workoutSessionDurationsSeconds ?? [];
    const nextDurations =
      durationSec > 0 ? [...prevDurations, durationSec] : prevDurations;
    const next = [...days];
    next[todayIndex] = {
      ...today,
      workoutStartedAtMs: undefined,
      workoutSessionDurationsSeconds:
        nextDurations.length > 0 ? nextDurations : undefined,
    };
    void persist(next);
  };

  const handleWeightChange = (weight: number | undefined) => {
    if (!today || todayIndex < 0) {
      return;
    }
    const w = today.weight;
    if (w != null && Number.isFinite(w) && w > 0) {
      return;
    }
    const next = [...days];
    next[todayIndex] = { ...today, weight };
    void persist(next);
  };

  const weightLockedForToday =
    today != null &&
    today.weight != null &&
    Number.isFinite(today.weight) &&
    today.weight > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={V.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!today || todayIndex < 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={V.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Vinland</Text>
        {prefsLoaded && displayName != null ? (
          <Text style={styles.welcome}>Welcome, {displayName}</Text>
        ) : null}
        <View style={styles.hero}>
          <View style={styles.heroDateRow}>
            <Text style={[styles.weekday, styles.heroWeekdayFlex]} numberOfLines={1}>
              {weekday}
            </Text>
            <Text style={styles.heroStreak} numberOfLines={1}>
              <Text style={styles.streakPrefix}>Streak: </Text>
              <Text style={[styles.weekday, styles.streakNumberOrange]}>{streak}</Text>
            </Text>
          </View>
          <Text style={styles.calendarDate}>{calendarLine}</Text>
        </View>

        <View style={styles.workoutCard}>
          <Text style={styles.cardTitle}>Today&apos;s workout</Text>
          {isRestDay ? (
            <Text style={styles.restDayBody}>
              Rest day — no workout planned. This still counts toward your streak. To
              schedule training instead, open the Week tab and remove the rest day for
              today.
            </Text>
          ) : (
            <>
              <View style={styles.workoutControlsRow}>
                <Pressable
                  onPress={workoutActive ? handleEndWorkout : handleStartWorkout}
                  style={({ pressed }) => [
                    styles.workoutActionBtn,
                    pressed && styles.workoutActionBtnPressed,
                  ]}
                >
                  <Text style={styles.workoutActionBtnText}>
                    {workoutActive ? 'End Workout' : 'Start Workout'}
                  </Text>
                </Pressable>
                <Text style={styles.workoutTimer} accessibilityLiveRegion="polite">
                  {formatHms(elapsedWorkoutSeconds)}
                </Text>
              </View>
              {!canToggleExercises && today.tasks.length > 0 ? (
                <Text style={styles.workoutGateHint}>
                  Start your workout to check off exercises.
                </Text>
              ) : null}

              {today.tasks.length === 0 ? (
                <Text style={styles.emptyWorkout}>
                  Nothing scheduled for today. Open the Week tab and add a saved workout
                  to this date (or mark a rest day).
                </Text>
              ) : (
                <>
                  {exerciseTotal > 0 ? (
                    <>
                      <Text style={styles.progressLabel}>
                        {exercisesDone} of {exerciseTotal} exercises done
                      </Text>
                      <View style={styles.progressTrack}>
                        <View
                          style={[styles.progressFill, { width: `${progressPct}%` }]}
                        />
                      </View>
                    </>
                  ) : null}
                  {today.tasks.map((task, index) => (
                    <TodayTaskRow
                      key={`${task.name}-${index}`}
                      task={task}
                      isFirstRow={index === 0}
                      exercisesLocked={!canToggleExercises}
                      onToggle={() => handleToggleTask(index)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionHeading}>Nutrition</Text>
        <View style={styles.nutritionCard}>
          {prefsLoaded ? (
            <Text style={styles.nutritionGoalLine}>
              Daily calorie goal: {dailyCalorieGoal.toLocaleString()} cal
            </Text>
          ) : null}
          <NutritionCheckRow
            title="Hit calorie goal today"
            subtitle={
              calorieHit
                ? "Locked until tomorrow — you can still edit calories over below."
                : 'Check when your intake is on track for your goal.'
            }
            checked={calorieHit}
            disabled={calorieHit}
            onToggle={() => handleCalorieGoalMark()}
          />
          {calorieHit ? (
            <View style={styles.caloriesOverBlock}>
              <Text style={styles.caloriesOverLabel}>Calories over goal (if any)</Text>
              <TextInput
                value={caloriesOverDraft}
                onChangeText={(t) => setCaloriesOverDraft(t.replace(/[^\d]/g, ''))}
                onEndEditing={() => commitCaloriesOver()}
                onSubmitEditing={() => commitCaloriesOver()}
                placeholder="0"
                placeholderTextColor={V.placeholder}
                keyboardType="number-pad"
                returnKeyType="done"
                style={styles.caloriesOverInput}
              />
              <Text style={styles.caloriesOverHint}>
                Optional. Enter how many calories above your goal (0 if you were at or under).
              </Text>
            </View>
          ) : null}
          <NutritionCheckRow
            title="Used cheat meal this week"
            subtitle="One check per week. Resets every Monday."
            checked={cheatMealUsed}
            disabled={cheatMealUsed}
            onToggle={() => {
              if (!cheatMealUsed) {
                void handleCheatMealChange(true);
              }
            }}
          />
          {cheatMealUsed ? (
            <Text style={styles.nutritionLockedHint}>Locked until next week.</Text>
          ) : null}
        </View>

        <Text style={styles.sectionHeading}>Weight</Text>
        <WeightInput
          weight={today.weight}
          onWeightChange={handleWeightChange}
          locked={weightLockedForToday}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Renders a section divider row or an interactive `TaskItem` on the Home checklist. */
function TodayTaskRow({
  task,
  isFirstRow,
  exercisesLocked,
  onToggle,
}: {
  task: Task;
  isFirstRow: boolean;
  exercisesLocked: boolean;
  onToggle: () => void;
}) {
  if (isWorkoutSectionHeader(task.name)) {
    const label = task.name.replace(/—/g, '').trim();
    return (
      <View
        style={[styles.sectionHeader, isFirstRow && styles.sectionHeaderFirst]}
      >
        <View style={styles.sectionRule} />
        <Text style={styles.sectionHeaderText}>{label}</Text>
        <View style={styles.sectionRule} />
      </View>
    );
  }

  return (
    <TaskItem
      name={task.name}
      completed={task.completed}
      exercise={task.exercise}
      disabled={exercisesLocked}
      onToggle={onToggle}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 15,
    fontWeight: '600',
    color: V.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: V.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  hero: {
    marginBottom: 24,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroWeekdayFlex: {
    flex: 1,
    minWidth: 0,
  },
  weekday: {
    fontSize: 36,
    fontWeight: '700',
    color: V.text,
    letterSpacing: -0.8,
  },
  heroStreak: {
    flexShrink: 0,
  },
  streakPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: V.text,
    letterSpacing: -0.4,
  },
  streakNumberOrange: {
    color: V.streakFlame,
  },
  calendarDate: {
    fontSize: 17,
    color: V.textSecondary,
    marginTop: 4,
  },
  workoutCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: V.text,
    marginBottom: 12,
  },
  restDayBody: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
  },
  workoutControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  workoutActionBtn: {
    backgroundColor: V.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    minWidth: 132,
    alignItems: 'center',
  },
  workoutActionBtnPressed: {
    opacity: 0.88,
  },
  workoutActionBtnText: {
    color: V.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  workoutTimer: {
    fontSize: 22,
    fontWeight: '700',
    color: V.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  workoutGateHint: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 20,
  },
  emptyWorkout: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: V.textSecondary,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: V.boxRadius,
    backgroundColor: V.trackBg,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: V.boxRadius,
    backgroundColor: V.trackFill,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 10,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: V.borderHairline,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: V.text,
    marginBottom: 10,
    marginTop: 4,
  },
  nutritionCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 20,
    marginBottom: 24,
  },
  nutritionGoalLine: {
    fontSize: 15,
    fontWeight: '600',
    color: V.textSecondary,
    marginBottom: 16,
  },
  caloriesOverBlock: {
    marginBottom: 16,
    marginTop: -4,
  },
  caloriesOverLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  caloriesOverInput: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 8,
  },
  caloriesOverHint: {
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
  },
  nutritionLockedHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: V.textDim,
  },
});
