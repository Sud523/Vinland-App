/**
 * Per-stat resets for metrics shown on the Stats tab (journal + weight goal profile).
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { V } from '../constants/vinlandTheme';
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandCard } from '../components/ui/VinlandCard';
import { VinlandSectionHeader } from '../components/ui/VinlandSectionHeader';
import type { RootStackParamList } from '../navigation/types';
import type { Day } from '../types';
import { confirmDestructive } from '../utils/confirmDestructive';
import {
  clearAllBodyWeights,
  clearCalorieGoalMarks,
  clearCountableExerciseCheckmarks,
  clearDaysWithLogTally,
  clearWorkoutSessionHistory,
} from '../utils/statResets';
import { clearWeightGoal, loadData, saveData } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'StatisticsSettings'>;

async function saveJournalTransform(transform: (days: Day[]) => Day[]): Promise<void> {
  const loaded = await loadData();
  await saveData(transform(loaded));
}

export default function StatisticsSettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  const runJournalReset = (
    title: string,
    message: string,
    transform: (days: Day[]) => Day[],
  ) => {
    confirmDestructive(title, message, 'Reset', async () => {
      try {
        await saveJournalTransform(transform);
        Alert.alert('Updated', 'Stats-related journal data was saved.');
      } catch {
        Alert.alert(
          'Couldn’t save',
          'Check your connection and try again, or reopen the app.',
        );
      }
    });
  };

  const runClearWeightGoal = () => {
    confirmDestructive(
      'Clear weight goal baseline?',
      'Removes your cutting/bulking starting point from your profile. You can set it again in Settings after you log weight on Home.',
      'Clear goal',
      async () => {
        try {
          await clearWeightGoal();
          Alert.alert('Updated', 'Weight goal baseline was cleared.');
        } catch {
          Alert.alert(
            'Couldn’t save',
            'Check your connection and try again, or reopen the app.',
          );
        }
      },
    );
  };

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
          Each control clears only the data behind that Stats metric. Your workout library
          and scheduled plans are not removed.
        </Text>

        <VinlandSectionHeader title="Exercise & completion" />
        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Completion %, streak & task counts</Text>
          <Text style={styles.hint}>
            Unchecks every exercise that counts toward the Stats ring, best streak, and
            completed-task totals. Optional exercises are unchanged.
          </Text>
          <VinlandButton
            title="Reset exercise checkmarks"
            variant="destructive"
            onPress={() =>
              runJournalReset(
                'Reset exercise checkmarks?',
                'This clears completion checkmarks for exercises that count toward Stats. It does not delete workouts from your days.',
                clearCountableExerciseCheckmarks,
              )
            }
          />
        </VinlandCard>

        <VinlandSectionHeader title="Days with a log" />
        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Days-with-log tally</Text>
          <Text style={styles.hint}>
            Clears exercise checkmarks that count toward Stats, rest-day marks, and logged
            body weights so those days no longer count as “with a log” unless something else
            remains.
          </Text>
          <VinlandButton
            title="Reset days-with-log data"
            variant="destructive"
            onPress={() =>
              runJournalReset(
                'Reset days-with-log data?',
                'Clears counted exercise checkmarks, rest days, and daily weight entries across your journal for this metric.',
                clearDaysWithLogTally,
              )
            }
          />
        </VinlandCard>

        <VinlandSectionHeader title="Nutrition" />
        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Calorie goal streak</Text>
          <Text style={styles.hint}>
            Removes “hit calorie goal” marks and optional “calories over” values from every
            day in your journal.
          </Text>
          <VinlandButton
            title="Reset calorie goal history"
            variant="destructive"
            onPress={() =>
              runJournalReset(
                'Reset calorie goal history?',
                'Clears calorie goal hits and overage numbers from all journal days.',
                clearCalorieGoalMarks,
              )
            }
          />
        </VinlandCard>

        <VinlandSectionHeader title="Workout time" />
        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Average workout time</Text>
          <Text style={styles.hint}>
            Deletes recorded session lengths from Home (Start/End workout) on every day.
          </Text>
          <VinlandButton
            title="Reset workout session times"
            variant="destructive"
            onPress={() =>
              runJournalReset(
                'Reset workout session times?',
                'Removes saved workout durations (and any stale “in progress” start time) from all days.',
                clearWorkoutSessionHistory,
              )
            }
          />
        </VinlandCard>

        <VinlandSectionHeader title="Weight" />
        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Logged body weights</Text>
          <Text style={styles.hint}>
            Clears the weight number saved on each journal day. Does not remove your cut/bulk
            baseline in Settings.
          </Text>
          <VinlandButton
            title="Clear all daily weights"
            variant="destructive"
            onPress={() =>
              runJournalReset(
                'Clear all daily weights?',
                'Removes saved weight from every day in your journal.',
                clearAllBodyWeights,
              )
            }
          />
        </VinlandCard>

        <VinlandCard padded style={styles.card}>
          <Text style={styles.cardTitle}>Weight goal baseline</Text>
          <Text style={styles.hint}>
            Clears your cutting/bulking starting snapshot from your account (the Stats “weight
            goal” block). Re-set it from Settings after you log weight on Home.
          </Text>
          <VinlandButton
            title="Clear weight goal baseline"
            variant="destructive"
            onPress={runClearWeightGoal}
          />
        </VinlandCard>
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
    paddingHorizontal: V.space.xl,
    paddingTop: V.space.sm,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: V.space.lg,
    lineHeight: 21,
  },
  card: {
    marginBottom: V.space.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: V.text,
    marginBottom: V.space.sm,
  },
  hint: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
    marginBottom: V.space.md,
  },
});
