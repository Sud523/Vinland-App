import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { currentWorkoutStreak } from '../utils/stats';
import { isWorkoutSectionHeader, taskCountsTowardDailyProgress } from '../utils/workouts';

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { displayName, prefsLoaded, dailyCalorieGoal } = useUserPrefs();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [cheatMealUsed, setCheatMealUsed] = useState(false);
  const [caloriesOverDraft, setCaloriesOverDraft] = useState('0');

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

        setDays(next);

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
    if (!today || todayIndex < 0) {
      return;
    }
    const tasks = today.tasks.map((t, i) =>
      i === taskIndex ? { ...t, completed: !t.completed } : t,
    );
    const next = [...days];
    next[todayIndex] = { ...today, tasks };
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
          <Text style={styles.weekday}>{weekday}</Text>
          <Text style={styles.calendarDate}>{calendarLine}</Text>
        </View>

        <View style={styles.workoutCard}>
          <Text style={styles.cardTitle}>Today&apos;s workout</Text>
          <Text style={styles.dateKey}>{date}</Text>

          {today.tasks.length === 0 ? (
            <Text style={styles.emptyWorkout}>
              Nothing scheduled for today. Open the Week tab and add a saved
              workout to this date.
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
                  onToggle={() => handleToggleTask(index)}
                />
              ))}
            </>
          )}
        </View>

        <Text style={styles.sectionHeading}>Streak</Text>
        <View style={styles.streakCard}>
          <Text style={styles.streakValue}>
            {streak}
            <Text style={styles.streakSuffix}>
              {' '}
              day{streak === 1 ? '' : 's'}
            </Text>
          </Text>
          <Text style={styles.streakHint}>
            Consecutive days where every exercise that counts toward your plan is
            checked off. Optional exercises don’t count. If today isn’t finished yet,
            yesterday can keep the streak alive.
          </Text>
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

function TodayTaskRow({
  task,
  isFirstRow,
  onToggle,
}: {
  task: Task;
  isFirstRow: boolean;
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
  weekday: {
    fontSize: 36,
    fontWeight: '700',
    color: V.text,
    letterSpacing: -0.8,
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
  },
  dateKey: {
    fontSize: 13,
    color: V.textTertiary,
    marginTop: 4,
    marginBottom: 16,
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
  streakCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 20,
    marginBottom: 16,
  },
  streakValue: {
    fontSize: 40,
    fontWeight: '700',
    color: V.streakFlame,
    letterSpacing: -1,
  },
  streakSuffix: {
    fontSize: 20,
    fontWeight: '600',
    color: V.textSecondary,
  },
  streakHint: {
    marginTop: 10,
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
  },
});
