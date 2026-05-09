/**
 * Browse and delete saved workout templates; entry point into `WorkoutForm` for new/edit.
 */
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { V } from '../constants/vinlandTheme';
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandCard } from '../components/ui/VinlandCard';
import { VinlandSectionHeader } from '../components/ui/VinlandSectionHeader';
import type { WorkoutsStackParamList } from '../navigation/types';
import type { SavedWorkout } from '../types';
import { loadSavedWorkouts } from '../utils/storage';
import { savedWorkoutExerciseCount, savedWorkoutLabel } from '../utils/workouts';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsList'>;

export default function WorkoutsListScreen({ navigation }: Props) {
  const tabBarHeight = useBottomTabBarHeight();
  const [savedList, setSavedList] = useState<SavedWorkout[]>([]);

  const refreshSaved = useCallback(() => {
    void loadSavedWorkouts().then(setSavedList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSaved();
    }, [refreshSaved]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.sub}>
          Create workouts you can reuse, then drop them onto your week or today’s plan.
        </Text>

        <VinlandButton
          title="Create new workout"
          onPress={() => navigation.navigate('WorkoutForm', {})}
          variant="primary"
        />

        <VinlandSectionHeader title="Your workouts" />

        {savedList.length === 0 ? (
          <VinlandCard style={styles.emptyCard} padded>
            <Text style={styles.emptyText}>
              No saved workouts yet. Tap &quot;Create new workout&quot; to add
              your first one.
            </Text>
          </VinlandCard>
        ) : (
          savedList.map((w) => (
            <VinlandCard key={w.id} style={styles.savedRow} padded>
              <View style={styles.savedInfo}>
                <Text style={styles.savedTitle}>{savedWorkoutLabel(w)}</Text>
                {w.description ? (
                  <Text style={styles.savedDescription} numberOfLines={2}>
                    {w.description}
                  </Text>
                ) : null}
                <Text style={styles.savedMeta}>
                  {savedWorkoutExerciseCount(w)} exercise
                  {savedWorkoutExerciseCount(w) === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('WorkoutExportPreview', { workoutId: w.id })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Download workout as PDF"
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="download-outline" size={18} color={V.link} />
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate('WorkoutForm', { editId: w.id })}
                  style={({ pressed }) => [
                    styles.editBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              </View>
            </VinlandCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scrollContent: {
    paddingHorizontal: V.space.xl,
    paddingTop: V.space.sm,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: V.space.lg,
    lineHeight: 21,
  },
  emptyCard: {
    marginTop: V.space.sm,
  },
  emptyText: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: V.space.sm,
  },
  savedInfo: {
    flex: 1,
    paddingRight: 12,
  },
  savedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: V.text,
  },
  savedMeta: {
    fontSize: 14,
    color: V.textTertiary,
    marginTop: 4,
  },
  savedDescription: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
  },
  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: V.link,
  },
  pressed: {
    opacity: 0.85,
  },
});
