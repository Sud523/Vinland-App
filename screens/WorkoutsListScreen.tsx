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
import type { WorkoutsStackParamList } from '../navigation/types';
import type { SavedWorkout } from '../types';
import { loadSavedWorkouts } from '../utils/storage';
import { savedWorkoutExerciseCount, savedWorkoutLabel } from '../utils/workouts';
import { downloadWorkoutPdf } from '../utils/workoutPdf';

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

        <Pressable
          onPress={() => navigation.navigate('WorkoutForm', {})}
          style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add-circle-outline" size={22} color={V.bg} />
          <Text style={styles.createBtnText}>Create new workout</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Your workouts</Text>

        {savedList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No saved workouts yet. Tap &quot;Create new workout&quot; to add
              your first one.
            </Text>
          </View>
        ) : (
          savedList.map((w) => (
            <View key={w.id} style={styles.savedRow}>
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
                  onPress={() => void downloadWorkoutPdf(w)}
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
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: 20,
    lineHeight: 21,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: V.accent,
    paddingVertical: 16,
    borderRadius: V.boxRadius,
    marginBottom: 28,
  },
  createBtnText: {
    color: V.bg,
    fontSize: 17,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    padding: 18,
  },
  emptyText: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 16,
    marginBottom: 10,
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
