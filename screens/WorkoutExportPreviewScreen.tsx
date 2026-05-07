/**
 * Preview a workout in a PDF-like layout before exporting.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { V } from '../constants/vinlandTheme';
import type { WorkoutsStackParamList } from '../navigation/types';
import type { SavedWorkout } from '../types';
import { loadSavedWorkouts } from '../utils/storage';
import { exerciseSummaryLines, savedWorkoutLabel } from '../utils/workouts';
import { downloadWorkoutPdf } from '../utils/workoutPdf';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutExportPreview'>;

function Section({
  title,
  workout,
}: {
  title: string;
  workout: SavedWorkout;
}) {
  const exercises =
    title === 'Warm up' ? workout.warmUp : title === 'Workout' ? workout.workout : workout.coolDown;

  if (!exercises || exercises.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        {exercises.map((ex, idx) => (
          <View key={`${ex.name}-${idx}`} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseTitle}>{ex.name}</Text>
              {ex.optional === true ? <Text style={styles.optionalTag}>Optional</Text> : null}
            </View>
            {exerciseSummaryLines(ex).map((line, j) => (
              <Text key={j} style={styles.exerciseLine}>
                {line}
              </Text>
            ))}
            {ex.notes ? <Text style={styles.exerciseNotes}>Notes: {ex.notes}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutExportPreviewScreen({ route }: Props) {
  const workoutId = route.params.workoutId;
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<SavedWorkout | null>(null);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setWorkout(null);
      void loadSavedWorkouts().then((list) => {
        if (cancelled) return;
        setWorkout(list.find((w) => w.id === workoutId) ?? null);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [workoutId]),
  );

  const title = useMemo(() => (workout ? savedWorkoutLabel(workout) : 'Workout'), [workout]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>{title}</Text>
          {workout?.description ? (
            <Text style={styles.previewSub}>{workout.description}</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={V.accent} />
          </View>
        ) : workout == null ? (
          <View style={styles.missingCard}>
            <Text style={styles.missingTitle}>Workout not found</Text>
            <Text style={styles.missingText}>Go back and try exporting again.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>
              This is a preview of what your PDF export will include.
            </Text>

            <Section title="Warm up" workout={workout} />
            <Section title="Workout" workout={workout} />
            <Section title="Cool down" workout={workout} />

            <Pressable
              onPress={() => {
                if (exporting) return;
                setExporting(true);
                Promise.resolve(downloadWorkoutPdf(workout)).finally(() => setExporting(false));
              }}
              style={({ pressed }) => [
                styles.exportBtn,
                pressed && !exporting && styles.pressed,
                exporting && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save as PDF"
            >
              {exporting ? (
                <ActivityIndicator color={V.bg} />
              ) : (
                <View style={styles.exportBtnInner}>
                  <Ionicons name="download-outline" size={18} color={V.bg} />
                  <Text style={styles.exportBtnText}>Save as PDF</Text>
                </View>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: V.bg },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  previewHeader: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
    padding: 16,
  },
  previewTitle: { fontSize: 20, fontWeight: '800', color: V.text },
  previewSub: { marginTop: 8, fontSize: 14, color: V.textSecondary, lineHeight: 20 },
  hint: { marginTop: 14, fontSize: 14, color: V.textSecondary, lineHeight: 20 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionBody: { gap: 10 },
  exerciseCard: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    backgroundColor: V.bgElevated,
    padding: 14,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  exerciseTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: V.text },
  optionalTag: { fontSize: 12, fontWeight: '700', color: V.textTertiary },
  exerciseLine: { marginTop: 4, fontSize: 14, color: V.textSecondary, lineHeight: 19 },
  exerciseNotes: { marginTop: 8, fontSize: 13, color: V.textTertiary, lineHeight: 18 },
  exportBtn: {
    marginTop: 18,
    backgroundColor: V.accent,
    paddingVertical: 16,
    borderRadius: V.boxRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exportBtnText: { color: V.bg, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  loading: { paddingVertical: 30, alignItems: 'center' },
  missingCard: {
    marginTop: 16,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    backgroundColor: V.bgElevated,
    padding: 16,
  },
  missingTitle: { fontSize: 16, fontWeight: '800', color: V.text, marginBottom: 6 },
  missingText: { fontSize: 14, color: V.textSecondary, lineHeight: 20 },
});

