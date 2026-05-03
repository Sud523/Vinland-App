/**
 * Week-at-a-glance planner: add saved workouts per day, swipe-delete scheduled blocks,
 * view completion state (past days locked for destructive edits).
 */
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import type { Day, SavedWorkout, Task } from '../types';
import { loadData, loadSavedWorkouts, saveData } from '../utils/storage';
import {
  isPastLocalDateKey,
  localDateKey,
  startOfWeekMonday,
} from '../utils/date';
import {
  countRestDaysInWeekExcluding,
  restDaysAllowedPerWeek,
} from '../utils/restDays';
import {
  exerciseSummaryLines,
  getScheduledWorkoutSegments,
  isWorkoutSectionHeader,
  removeTaskIndexRange,
  savedWorkoutExerciseCount,
  savedWorkoutLabel,
  savedWorkoutToTasks,
  taskCountsTowardDailyProgress,
  workoutSectionDisplayTitle,
} from '../utils/workouts';

const STATUS_COL_W = 28;

/** True when every non-header, progress-counting task in the slice is completed. */
function segmentAllExercisesComplete(slice: Task[]): boolean {
  const required = slice.filter(
    (t) => !isWorkoutSectionHeader(t.name) && taskCountsTowardDailyProgress(t),
  );
  return required.length > 0 && required.every((t) => t.completed);
}

/** Seven local dates starting Monday of the week containing `anchor`, with display headings. */
function getWeekDaySlots(anchor: Date): { dateKey: string; heading: string }[] {
  const start = startOfWeekMonday(anchor);
  const slots: { dateKey: string; heading: string }[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    slots.push({
      dateKey: localDateKey(d),
      heading: d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    });
  }
  return slots;
}

/** One row in the week list: section title or exercise with summary lines and completion glyph. */
function WorkoutLine({
  task,
  showDividerBelow = true,
}: {
  task: Task;
  showDividerBelow?: boolean;
}) {
  const section = isWorkoutSectionHeader(task.name);
  const lines = task.exercise ? exerciseSummaryLines(task.exercise) : [];
  return (
    <View
      style={[styles.workoutRow, !showDividerBelow && styles.workoutRowNoDivider]}
    >
      <View style={[styles.workoutStatusCol, { width: STATUS_COL_W }]}>
        {section ? null : (
          <Text
            style={[
              styles.workoutStatusSymbol,
              task.completed && styles.workoutStatusSymbolDone,
            ]}
            accessibilityLabel={task.completed ? 'Completed' : 'Not completed'}
          >
            {task.completed ? '✓' : '–'}
          </Text>
        )}
      </View>
      <View style={styles.workoutCol}>
        {section ? (
          <Text style={styles.workoutBlockTitle}>
            {workoutSectionDisplayTitle(task.name)}
          </Text>
        ) : (
          <>
            <Text style={styles.workoutExerciseTitle}>
              {task.name}
              {task.exercise?.optional ? (
                <Text style={styles.optionalBadge}> · Optional</Text>
              ) : null}
            </Text>
            {lines.length > 0 ? (
              <View style={styles.workoutDetails}>
                {lines.map((line, i) => (
                  <Text key={i} style={styles.workoutExerciseDetailLine}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

/** Swipeable scheduled block for a day: deletes task index range when user confirms swipe. */
function ScheduledWorkoutBlock({
  dateKey,
  tasks,
  start,
  end,
  setDays,
  canEdit,
}: {
  dateKey: string;
  tasks: Task[];
  start: number;
  end: number;
  setDays: React.Dispatch<React.SetStateAction<Day[]>>;
  canEdit: boolean;
}) {
  const slice = tasks.slice(start, end + 1);
  const segmentDone = segmentAllExercisesComplete(slice);

  const removeSegment = async () => {
    if (!canEdit || isPastLocalDateKey(dateKey)) {
      return;
    }
    const loaded = await loadData();
    const idx = loaded.findIndex((d) => d.date === dateKey);
    if (idx < 0) {
      return;
    }
    const day = loaded[idx] as Day;
    const nextTasks = removeTaskIndexRange(day.tasks, start, end);
    const next = [...loaded];
    next[idx] = { ...day, tasks: nextTasks };
    await saveData(next);
    setDays(next);
  };

  const blockContent = (
    <View style={styles.workoutBlock}>
      <View style={styles.workoutBlockHeaderRow}>
        <View style={styles.workoutBlockLines}>
          {slice.map((task, j) => (
            <WorkoutLine
              key={`${dateKey}-${start + j}-${task.name}`}
              task={task}
              showDividerBelow={j < slice.length - 1}
            />
          ))}
        </View>
        {segmentDone ? (
          <Text style={styles.segmentDoneLabel}>Done</Text>
        ) : null}
      </View>
    </View>
  );

  if (!canEdit) {
    return blockContent;
  }

  return (
    <Swipeable
      friction={2}
      overshootRight={false}
      enabled={canEdit}
      renderRightActions={(_progress, _drag, swipeable) => (
        <View style={styles.swipeDeleteTrack}>
          <Pressable
            onPress={() => {
              swipeable.close();
              void removeSegment();
            }}
            style={({ pressed }) => [
              styles.swipeDeleteSquare,
              pressed && styles.swipeDeleteBtnPressed,
            ]}
            accessibilityLabel="Remove workout"
            accessibilityRole="button"
          >
            <Ionicons name="remove" size={22} color={V.accent} />
          </Pressable>
        </View>
      )}
    >
      {blockContent}
    </Swipeable>
  );
}

/** Main week planner screen: owns loaded `days`, week paging, and add-workout modal state. */
export default function WeeklyScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { workoutsPerWeek } = useUserPrefs();
  const [days, setDays] = useState<Day[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [pickerForDate, setPickerForDate] = useState<string | null>(null);

  const weekSlots = useMemo(() => getWeekDaySlots(weekAnchor), [weekAnchor]);

  const weekMondayKey = weekSlots[0]?.dateKey ?? '';
  const restBudget = useMemo(
    () => restDaysAllowedPerWeek(workoutsPerWeek),
    [workoutsPerWeek],
  );

  const weekLabel = useMemo(() => {
    const first = weekSlots[0]?.dateKey;
    const last = weekSlots[6]?.dateKey;
    if (!first || !last) {
      return '';
    }
    return `${first} → ${last}`;
  }, [weekSlots]);

  const refresh = useCallback(async () => {
    const [loadedDays, library] = await Promise.all([
      loadData(),
      loadSavedWorkouts(),
    ]);
    return { loadedDays, library };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setWeekAnchor(new Date());
      let cancelled = false;
      (async () => {
        try {
          const { loadedDays, library } = await refresh();
          if (!cancelled) {
            setDays(loadedDays);
            setSavedWorkouts(library);
          }
        } catch {
          if (!cancelled) {
            setDays([]);
            setSavedWorkouts([]);
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
    }, [refresh]),
  );

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const addSavedWorkoutToDay = async (dateKey: string, w: SavedWorkout) => {
    if (isPastLocalDateKey(dateKey)) {
      setPickerForDate(null);
      return;
    }
    const loaded = await loadData();
    const existing = loaded.find((d) => d.date === dateKey);
    if (existing?.restDay === true) {
      setPickerForDate(null);
      return;
    }
    const newTasks = savedWorkoutToTasks(w);
    const idx = loaded.findIndex((d) => d.date === dateKey);
    const next = [...loaded];

    if (idx < 0) {
      next.push({ date: dateKey, tasks: newTasks });
    } else {
      const day = next[idx] as Day;
      next[idx] = { ...day, tasks: [...day.tasks, ...newTasks] };
    }

    await saveData(next);
    setDays(next);
    setPickerForDate(null);
  };

  const setRestDayForDate = async (dateKey: string, marking: boolean) => {
    if (isPastLocalDateKey(dateKey) || !weekMondayKey) {
      return;
    }
    const loaded = await loadData();
    const idx = loaded.findIndex((d) => d.date === dateKey);

    if (marking) {
      const usedExcl = countRestDaysInWeekExcluding(loaded, weekMondayKey, dateKey);
      if (usedExcl >= restBudget) {
        return;
      }
      const next = [...loaded];
      if (idx < 0) {
        next.push({
          date: dateKey,
          tasks: [],
          restDay: true,
        });
      } else {
        const day = next[idx] as Day;
        next[idx] = {
          ...day,
          restDay: true,
          tasks: [],
          workoutStartedAtMs: undefined,
        };
      }
      await saveData(next);
      setDays(next);
      return;
    }

    if (idx < 0) {
      return;
    }
    const day = loaded[idx] as Day;
    if (day.restDay !== true) {
      return;
    }
    const next = [...loaded];
    next[idx] = { ...day, restDay: false };
    await saveData(next);
    setDays(next);
  };

  const pickerHeading = pickerForDate
    ? weekSlots.find((s) => s.dateKey === pickerForDate)?.heading ?? pickerForDate
    : '';

  if (loading) {
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
        <Text style={styles.sub}>
          This week ({weekLabel}). Target {workoutsPerWeek} workout
          {workoutsPerWeek === 1 ? '' : 's'}/week → {restBudget} rest day
          {restBudget === 1 ? '' : 's'} to place. Past days are view-only. Swipe a
          workout left to remove it. Add workouts on today or future days that are not
          rest days.
        </Text>

        {weekSlots.map(({ dateKey, heading }) => {
          const day = byDate.get(dateKey);
          const tasks = day?.tasks ?? [];
          const isRestDay = day?.restDay === true;
          const weightNote =
            day?.weight != null ? `Weight: ${day.weight} lb` : null;
          const dayLocked = isPastLocalDateKey(dateKey);
          const usedExcl = countRestDaysInWeekExcluding(days, weekMondayKey, dateKey);
          const canMarkRest =
            !dayLocked && !isRestDay && usedExcl < restBudget && restBudget > 0;
          const addWorkoutLocked = dayLocked || isRestDay;

          let restBtnLabel: string;
          if (dayLocked) {
            restBtnLabel = isRestDay ? 'Rest day' : 'Rest day (locked)';
          } else if (isRestDay) {
            restBtnLabel = 'Remove rest day';
          } else if (restBudget <= 0) {
            restBtnLabel = 'No rest days';
          } else if (!canMarkRest) {
            restBtnLabel = 'Rest days used';
          } else {
            restBtnLabel = 'Rest day';
          }

          const restBtnDisabled = dayLocked
            ? true
            : isRestDay
              ? false
              : restBudget <= 0 || !canMarkRest;

          return (
            <View key={dateKey} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{heading}</Text>
                <Text style={styles.dayKey}>{dateKey}</Text>
              </View>
              {dayLocked ? (
                <Text style={styles.pastHint}>Past — schedule, rest days, and removals locked</Text>
              ) : null}
              {isRestDay && !dayLocked ? (
                <Text style={styles.restDayHint}>
                  Rest day — no workouts this date. Counts toward your streak.
                </Text>
              ) : null}
              {weightNote ? (
                <Text style={styles.weightHint}>{weightNote}</Text>
              ) : null}

              <View style={styles.workoutList}>
                {isRestDay ? (
                  <Text style={styles.empty}>No workouts (recovery).</Text>
                ) : tasks.length === 0 ? (
                  <Text style={styles.empty}>No workouts scheduled yet.</Text>
                ) : (
                  getScheduledWorkoutSegments(tasks).map((seg) => (
                    <ScheduledWorkoutBlock
                      key={`${dateKey}-seg-${seg.start}`}
                      dateKey={dateKey}
                      tasks={tasks}
                      start={seg.start}
                      end={seg.end}
                      setDays={setDays}
                      canEdit={!dayLocked}
                    />
                  ))
                )}
              </View>

              <View style={styles.pickBtnRow}>
                <Pressable
                  disabled={addWorkoutLocked}
                  onPress={() => {
                    if (!addWorkoutLocked) {
                      setPickerForDate(dateKey);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.pickBtn,
                    styles.pickBtnFlex,
                    addWorkoutLocked && styles.pickBtnDisabled,
                    pressed && !addWorkoutLocked && styles.pickBtnPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickBtnText,
                      addWorkoutLocked && styles.pickBtnTextDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {dayLocked
                      ? 'Add workout (locked)'
                      : isRestDay
                        ? 'Add workout (rest day)'
                        : 'Add workout'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={restBtnDisabled}
                  onPress={() => {
                    if (dayLocked) {
                      return;
                    }
                    if (isRestDay) {
                      void setRestDayForDate(dateKey, false);
                    } else if (canMarkRest) {
                      void setRestDayForDate(dateKey, true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.pickBtn,
                    styles.pickBtnFlex,
                    restBtnDisabled && styles.pickBtnDisabled,
                    pressed && !restBtnDisabled && styles.pickBtnPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickBtnText,
                      restBtnDisabled && styles.pickBtnTextDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {restBtnLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={pickerForDate != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerForDate(null)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose workout</Text>
            <Text style={styles.modalSub}>{pickerHeading}</Text>
            <Pressable
              onPress={() => setPickerForDate(null)}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pickBtnPressed]}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>

          {savedWorkouts.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>
                No saved workouts yet. Open Workouts, create one, and save it to
                your library.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedWorkouts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    if (pickerForDate == null) {
                      return;
                    }
                    if (isPastLocalDateKey(pickerForDate)) {
                      setPickerForDate(null);
                      return;
                    }
                    void addSavedWorkoutToDay(pickerForDate, item);
                  }}
                  style={({ pressed }) => [
                    styles.savedRow,
                    pressed && styles.savedRowPressed,
                  ]}
                >
                  <Text style={styles.savedTitle}>{savedWorkoutLabel(item)}</Text>
                  {item.description ? (
                    <Text style={styles.savedRowDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.savedMeta}>
                    {savedWorkoutExerciseCount(item)} exercise
                    {savedWorkoutExerciseCount(item) === 1 ? '' : 's'}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scrollContent: {
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
    marginBottom: 20,
    lineHeight: 21,
  },
  dayCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 16,
    marginBottom: 14,
  },
  dayHeader: {
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: V.text,
  },
  dayKey: {
    fontSize: 13,
    color: V.textTertiary,
    marginTop: 2,
  },
  weightHint: {
    fontSize: 14,
    color: V.accentMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  workoutList: {
    marginTop: 8,
    marginBottom: 12,
    minHeight: 24,
  },
  empty: {
    fontSize: 15,
    color: V.textTertiary,
    fontStyle: 'italic',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V.borderHairline,
  },
  workoutRowNoDivider: {
    borderBottomWidth: 0,
  },
  workoutBlock: {
    marginBottom: 12,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    backgroundColor: V.bg,
  },
  workoutBlockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workoutBlockLines: {
    flex: 1,
    minWidth: 0,
  },
  segmentDoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: V.onComplete,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 10,
    paddingRight: 10,
    paddingLeft: 6,
  },
  swipeDeleteTrack: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  swipeDeleteSquare: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
  },
  swipeDeleteBtnPressed: {
    opacity: 0.85,
  },
  pastHint: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    marginBottom: 6,
  },
  workoutStatusCol: {
    alignItems: 'center',
    paddingTop: 2,
    marginRight: 6,
  },
  workoutStatusSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: V.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  workoutStatusSymbolDone: {
    color: V.onComplete,
  },
  workoutCol: {
    flex: 1,
    minWidth: 0,
  },
  workoutBlockTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: V.text,
    letterSpacing: -0.3,
  },
  workoutExerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: -0.2,
  },
  optionalBadge: {
    fontSize: 14,
    fontWeight: '500',
    color: V.textTertiary,
  },
  workoutDetails: {
    marginTop: 6,
  },
  workoutExerciseDetailLine: {
    fontSize: 14,
    color: V.textDim,
    lineHeight: 20,
  },
  pickBtnRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  pickBtnFlex: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  restDayHint: {
    fontSize: 14,
    fontWeight: '600',
    color: V.accentMuted,
    marginBottom: 6,
  },
  pickBtn: {
    backgroundColor: V.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickBtnPressed: {
    opacity: 0.85,
  },
  pickBtnText: {
    color: V.bg,
    fontWeight: '600',
    fontSize: 16,
  },
  pickBtnDisabled: {
    backgroundColor: V.surfaceComplete,
    borderColor: V.borderMuted,
    opacity: 1,
  },
  pickBtnTextDisabled: {
    color: V.textDim,
    fontSize: 14,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: V.modalBg,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V.borderHairline,
    backgroundColor: V.bgElevated,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: V.text,
  },
  modalSub: {
    fontSize: 15,
    color: V.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
  },
  cancelBtnText: {
    fontSize: 17,
    color: V.link,
    fontWeight: '600',
  },
  modalList: {
    padding: 20,
    paddingBottom: 40,
  },
  modalEmpty: {
    padding: 24,
  },
  modalEmptyText: {
    fontSize: 16,
    color: V.textSecondary,
    lineHeight: 22,
  },
  savedRow: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 16,
    marginBottom: 10,
  },
  savedRowPressed: {
    opacity: 0.9,
  },
  savedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: V.text,
  },
  savedRowDescription: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  savedMeta: {
    fontSize: 14,
    color: V.textTertiary,
    marginTop: 4,
  },
});
