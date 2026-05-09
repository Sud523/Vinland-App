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
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandCard } from '../components/ui/VinlandCard';
import { VinlandSectionHeader } from '../components/ui/VinlandSectionHeader';
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
      <VinlandSectionHeader title={title} style={styles.sectionHeader} />
      <View style={styles.sectionBody}>
        {exercises.map((ex, idx) => (
          <VinlandCard key={`${ex.name}-${idx}`} style={styles.exerciseCard} padded>
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
          </VinlandCard>
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
            <ActivityIndicator color={V.runeGlow} />
          </View>
        ) : workout == null ? (
          <VinlandCard style={styles.missingCard} padded>
            <Text style={styles.missingTitle}>Workout not found</Text>
            <Text style={styles.missingText}>Go back and try exporting again.</Text>
          </VinlandCard>
        ) : (
          <>
            <Text style={styles.hint}>
              This is a preview of what your PDF export will include.
            </Text>

            <Section title="Warm up" workout={workout} />
            <Section title="Workout" workout={workout} />
            <Section title="Cool down" workout={workout} />

            <VinlandButton
              title={exporting ? 'Saving…' : 'Save as PDF'}
              variant="primary"
              disabled={exporting}
              onPress={() => {
                if (exporting) return;
                setExporting(true);
                Promise.resolve(downloadWorkoutPdf(workout)).finally(() => setExporting(false));
              }}
              style={styles.exportBtn}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: V.bg },
  content: { paddingHorizontal: V.space.xl, paddingTop: V.space.sm, paddingBottom: V.space.xxxl },
  previewHeader: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
    padding: 16,
  },
  previewTitle: { fontSize: 20, fontWeight: '400', color: V.text },
  previewSub: { marginTop: 8, fontSize: 14, color: V.textSecondary, lineHeight: 20 },
  hint: { marginTop: 14, fontSize: 14, color: V.textSecondary, lineHeight: 20 },
  section: { marginTop: 18 },
  sectionHeader: { marginTop: 0, marginBottom: 10 },
  sectionBody: { gap: 10 },
  exerciseCard: {
    padding: 0,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  exerciseTitle: { flex: 1, fontSize: 16, fontWeight: '400', color: V.text },
  optionalTag: { fontSize: 12, fontWeight: '400', color: V.textTertiary },
  exerciseLine: { marginTop: 4, fontSize: 14, color: V.textSecondary, lineHeight: 19 },
  exerciseNotes: { marginTop: 8, fontSize: 13, color: V.textTertiary, lineHeight: 18 },
  exportBtn: {
    marginTop: 18,
  },
  loading: { paddingVertical: 30, alignItems: 'center' },
  missingCard: {
    marginTop: 16,
    padding: 0,
  },
  missingTitle: { fontSize: 16, fontWeight: '400', color: V.text, marginBottom: 6 },
  missingText: { fontSize: 14, color: V.textSecondary, lineHeight: 20 },
});

