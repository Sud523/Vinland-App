/**
 * Aggregate history: completion %, best streak, weight vs goal baseline, calorie streak rings.
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompletionRing } from '../components/CompletionRing';
import { V } from '../constants/vinlandTheme';
import type { Day } from '../types';
import { parseDateKeyLocal } from '../utils/date';
import { getLatestWeightEntry } from '../utils/journalWeight';
import { calorieGoalHitStreak, computeStats, formatHms } from '../utils/stats';
import { loadData, loadWeightGoal, type WeightGoalState } from '../utils/storage';

/** Renders a journal date key as a short locale date string for copy blocks. */
function formatDateKey(key: string): string {
  return parseDateKeyLocal(key).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StatsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [days, setDays] = useState<Day[]>([]);
  const [weightGoal, setWeightGoal] = useState<WeightGoalState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [loaded, goal] = await Promise.all([loadData(), loadWeightGoal()]);
    return { loaded, goal };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const { loaded, goal } = await refresh();
          if (!cancelled) {
            setDays(loaded);
            setWeightGoal(goal);
          }
        } catch {
          if (!cancelled) {
            setDays([]);
            setWeightGoal(null);
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

  const stats = useMemo(() => computeStats(days), [days]);
  const calorieStreak = useMemo(
    () => calorieGoalHitStreak(days, new Date()),
    [days],
  );

  const weightProgress = useMemo(() => {
    if (weightGoal == null) {
      return null;
    }
    const latest = getLatestWeightEntry(days);
    if (!latest) {
      return {
        kind: 'no_logs' as const,
      };
    }
    const delta = latest.weight - weightGoal.baselineWeightLb;
    const abs = Math.abs(delta);
    const absStr = abs.toFixed(1);
    const baselineLabel = formatDateKey(weightGoal.baselineDateKey);
    const latestLabel = formatDateKey(latest.dateKey);

    let headline: string;
    if (weightGoal.mode === 'lose') {
      if (delta < 0) {
        headline = `Down ${absStr} lb since ${baselineLabel}`;
      } else if (delta > 0) {
        headline = `Up ${absStr} lb since ${baselineLabel}`;
      } else {
        headline = `No change since ${baselineLabel}`;
      }
    } else {
      if (delta > 0) {
        headline = `Up ${absStr} lb since ${baselineLabel}`;
      } else if (delta < 0) {
        headline = `Down ${absStr} lb since ${baselineLabel}`;
      } else {
        headline = `No change since ${baselineLabel}`;
      }
    }

    return {
      kind: 'ok' as const,
      headline,
      latestWeight: latest.weight,
      latestLabel,
      baselineWeight: weightGoal.baselineWeightLb,
      baselineLabel,
    };
  }, [days, weightGoal]);

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
          How you’re doing over time: completion, streaks, and weight vs your goal.
        </Text>

        <CompletionRing percentage={stats.completionPct} />

        <StatCard
          label="Best completion streak"
          value={`${stats.bestStreak} day${stats.bestStreak === 1 ? '' : 's'}`}
          hint="Longest stretch of days where you finished every exercise that counts (optional moves don’t count)"
        />
        <StatCard
          label="Days with a log"
          value={String(stats.daysWithActivity)}
          hint="Days you trained or logged your weight"
        />
        <StatCard
          label="Tasks completed"
          value={`${stats.completedTasks} / ${stats.totalTasks}`}
          hint="Exercises you checked off out of those that count toward your plan (optional moves don’t count)"
        />
        <StatCard
          label="Calorie goal streak"
          value={`${calorieStreak} day${calorieStreak === 1 ? '' : 's'}`}
          hint="In a row, how many days (counting back from today) you said you hit your calorie goal on Home"
        />
        <StatCard
          label="Average workout time"
          value={
            stats.avgWorkoutSessionSeconds != null
              ? formatHms(Math.round(stats.avgWorkoutSessionSeconds))
              : '—'
          }
          hint={
            stats.workoutSessionCount > 0
              ? `Average length of ${stats.workoutSessionCount} workout${stats.workoutSessionCount === 1 ? '' : 's'} you started and finished on Home.`
              : 'On Home, tap Start workout and End workout to record how long you trained.'
          }
        />

        <Text style={styles.sectionTitle}>Weight goal</Text>
        {weightGoal == null ? (
          <View style={styles.goalCard}>
            <Text style={styles.goalBodyMuted}>
              No weight goal yet. After you log weight on Home, open Settings (gear) to
              choose lose weight or gain weight.
            </Text>
          </View>
        ) : (
          <View style={styles.goalCard}>
            <Text style={styles.goalModeLabel}>
              {weightGoal.mode === 'lose' ? 'Cutting' : 'Bulking'}
            </Text>
            <Text style={styles.goalModeHint}>
              {weightGoal.mode === 'lose'
                ? 'Losing weight'
                : 'Gaining weight'}
            </Text>
            {weightProgress?.kind === 'no_logs' ? (
              <Text style={[styles.goalBodyMuted, styles.goalBodySpaced]}>
                Log your weight on Home to see progress from your starting point.
              </Text>
            ) : weightProgress?.kind === 'ok' ? (
              <>
                <Text style={[styles.goalHeadline, styles.goalBodySpaced]}>
                  {weightProgress.headline}
                </Text>
                <Text style={styles.goalMeta}>
                  Started at {weightProgress.baselineWeight.toFixed(1)} lb · Now{' '}
                  {weightProgress.latestWeight.toFixed(1)} lb (
                  {weightProgress.latestLabel})
                </Text>
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
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
    marginBottom: 8,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 18,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: V.text,
  },
  statHint: {
    marginTop: 6,
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
  },
  goalCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 18,
    marginBottom: 16,
  },
  goalModeLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: V.text,
  },
  goalModeHint: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: 4,
  },
  goalBodySpaced: {
    marginTop: 12,
  },
  goalHeadline: {
    fontSize: 17,
    fontWeight: '600',
    color: V.text,
    lineHeight: 24,
  },
  goalMeta: {
    marginTop: 10,
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
  },
  goalBodyMuted: {
    fontSize: 14,
    color: V.textTertiary,
    lineHeight: 20,
  },
});
