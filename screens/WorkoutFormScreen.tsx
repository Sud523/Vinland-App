/**
 * Create or edit a `SavedWorkout`: warm up / workout / cool down exercise builders, validation, persist library.
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseEditorCard } from '../components/ExerciseEditorCard';
import { V } from '../constants/vinlandTheme';
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandInput } from '../components/ui/VinlandInput';
import { VinlandConfirmDialog } from '../components/ui/VinlandConfirmDialog';
import { VinlandModalOverlay } from '../components/ui/VinlandModalOverlay';
import type { WorkoutsStackParamList } from '../navigation/types';
import type { Day, ExerciseDefinition, ExerciseFormInput, SavedWorkout } from '../types';
import { localDateKey } from '../utils/date';
import { loadData, loadSavedWorkouts, saveData, saveSavedWorkouts } from '../utils/storage';
import {
  emptyExerciseForm,
  exerciseDefinitionToFormInput,
  newSavedWorkoutId,
  savedWorkoutToTasks,
  sectionedFormsToDefinitions,
} from '../utils/workouts';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutForm'>;

type ExerciseRow = { id: string; form: ExerciseFormInput };

function newExerciseRow(): ExerciseRow {
  return { id: newSavedWorkoutId(), form: emptyExerciseForm() };
}

function rowsFromDefinitions(exercises: ExerciseDefinition[]): ExerciseRow[] {
  if (exercises.length === 0) {
    return [];
  }
  return exercises.map((ex) => ({
    id: newSavedWorkoutId(),
    form: exerciseDefinitionToFormInput(ex),
  }));
}

function defaultWorkoutRows(): ExerciseRow[] {
  return [newExerciseRow()];
}

export default function WorkoutFormScreen({ navigation, route }: Props) {
  const tabBarHeight = useBottomTabBarHeight();
  const editId = route.params?.editId;
  /** Links parent scroll + draggable lists so vertical scroll works on web (e.g. GitHub Pages on iPhone). */
  const formScrollRef = useRef<React.ComponentRef<typeof GestureScrollView>>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [savingLabel, setSavingLabel] = useState<'save' | 'add' | 'delete'>('save');
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [warmUpRows, setWarmUpRows] = useState<ExerciseRow[]>([]);
  const [workoutRows, setWorkoutRows] = useState<ExerciseRow[]>(defaultWorkoutRows);
  const [coolDownRows, setCoolDownRows] = useState<ExerciseRow[]>([]);

  const populateFromWorkout = useCallback((w: SavedWorkout) => {
    setEditingId(w.id);
    setWorkoutName(w.title);
    setWorkoutDescription(w.description ?? '');
    setWarmUpRows(rowsFromDefinitions(w.warmUp));
    setWorkoutRows(rowsFromDefinitions(w.workout));
    setCoolDownRows(rowsFromDefinitions(w.coolDown));
  }, []);

  useEffect(() => {
    if (editingId == null) {
      setDeleteConfirmVisible(false);
    }
  }, [editingId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!editId) {
        setEditingId(null);
        setWorkoutName('');
        setWorkoutDescription('');
        setWarmUpRows([]);
        setWorkoutRows(defaultWorkoutRows());
        setCoolDownRows([]);
        return () => {
          cancelled = true;
        };
      }

      setEditingId(null);
      setWorkoutName('');
      setWorkoutDescription('');
      setWarmUpRows([]);
      setWorkoutRows(defaultWorkoutRows());
      setCoolDownRows([]);

      void loadSavedWorkouts().then((list) => {
        if (cancelled) {
          return;
        }
        const w = list.find((x) => x.id === editId);
        if (w) {
          populateFromWorkout(w);
        } else {
          navigation.goBack();
        }
      });

      return () => {
        cancelled = true;
      };
    }, [editId, navigation, populateFromWorkout]),
  );

  const updateWarmUpForm = useCallback((index: number, next: ExerciseFormInput) => {
    setWarmUpRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, form: next } : r)),
    );
  }, []);

  const updateWorkoutForm = useCallback((index: number, next: ExerciseFormInput) => {
    setWorkoutRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, form: next } : r)),
    );
  }, []);

  const updateCoolDownForm = useCallback((index: number, next: ExerciseFormInput) => {
    setCoolDownRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, form: next } : r)),
    );
  }, []);

  const removeWarmUp = useCallback((index: number) => {
    setWarmUpRows((prev) =>
      prev.length <= 1 ? [] : prev.filter((_, i) => i !== index),
    );
  }, []);

  const removeWorkout = useCallback((index: number) => {
    setWorkoutRows((prev) =>
      prev.length <= 1 ? [] : prev.filter((_, i) => i !== index),
    );
  }, []);

  const removeCoolDown = useCallback((index: number) => {
    setCoolDownRows((prev) =>
      prev.length <= 1 ? [] : prev.filter((_, i) => i !== index),
    );
  }, []);

  const validateWorkoutName = (): boolean => {
    if (!workoutName.trim()) {
      Alert.alert('Name this workout', 'Give it a short name so you can find it later.');
      return false;
    }
    return true;
  };

  const parseSections = () => {
    const warmForms = warmUpRows.map((r) => r.form);
    const mainForms = workoutRows.map((r) => r.form);
    const coolForms = coolDownRows.map((r) => r.form);
    return sectionedFormsToDefinitions(warmForms, mainForms, coolForms);
  };

  /** Leave the editor and return to the workouts list (root of this stack). */
  const exitToWorkoutList = () => {
    navigation.popToTop();
  };

  const saveWorkoutToLibrary = async () => {
    Keyboard.dismiss();
    if (isSaving) {
      return;
    }
    if (!validateWorkoutName()) {
      return;
    }
    const parsed = parseSections();
    if (!parsed.ok) {
      Alert.alert('Fix the exercises', parsed.message);
      return;
    }

    const title = workoutName.trim();
    const descTrim = workoutDescription.trim();
    const description = descTrim.length > 0 ? descTrim : undefined;

    let list: SavedWorkout[];
    try {
      list = await loadSavedWorkouts();
    } catch {
      Alert.alert(
        'Couldn’t load workouts',
        'Check your connection and try again, or close and reopen the app.',
      );
      return;
    }

    const currentEditId = editingId;

    setSavingLabel('save');
    setIsSaving(true);
    try {
      // Persists the full library to Supabase (workout_templates + sections + exercises).
      if (currentEditId != null) {
        const next = list.map((w) => {
          if (w.id !== currentEditId) {
            return w;
          }
          const updated: SavedWorkout = {
            ...w,
            title,
            warmUp: parsed.warmUp,
            workout: parsed.workout,
            coolDown: parsed.coolDown,
          };
          if (description != null) {
            updated.description = description;
          } else {
            delete updated.description;
          }
          return updated;
        });
        await saveSavedWorkouts(next);
      } else {
        const nextSaved: SavedWorkout = {
          id: newSavedWorkoutId(),
          title,
          warmUp: parsed.warmUp,
          workout: parsed.workout,
          coolDown: parsed.coolDown,
          ...(description != null ? { description } : {}),
        };
        await saveSavedWorkouts([...list, nextSaved]);
      }
    } catch {
      setIsSaving(false);
      Alert.alert(
        'Couldn’t save workout',
        'Check your connection and try again, or close and reopen the app.',
      );
      return;
    }

    exitToWorkoutList();
    InteractionManager.runAfterInteractions(() => {
      Alert.alert(
        currentEditId != null ? 'Updated' : 'Saved',
        currentEditId != null
          ? 'Your changes are saved to your account.'
          : 'This workout is in your library.',
      );
    });
  };

  const addToToday = async () => {
    Keyboard.dismiss();
    if (isSaving) {
      return;
    }
    if (!validateWorkoutName()) {
      return;
    }
    const parsed = parseSections();
    if (!parsed.ok) {
      Alert.alert('Fix the exercises', parsed.message);
      return;
    }

    const newTasks = savedWorkoutToTasks({
      id: editingId ?? 'draft',
      title: workoutName.trim(),
      warmUp: parsed.warmUp,
      workout: parsed.workout,
      coolDown: parsed.coolDown,
    });

    setSavingLabel('add');
    setIsSaving(true);
    try {
      const loaded = await loadData();
      const date = localDateKey(new Date());
      const idx = loaded.findIndex((d) => d.date === date);
      const next = [...loaded];

      if (idx < 0) {
        next.push({ date, tasks: newTasks });
      } else {
        const day = next[idx] as Day;
        next[idx] = { ...day, tasks: [...day.tasks, ...newTasks] };
      }

      await saveData(next);
      setIsSaving(false);
      Alert.alert('Added', 'This workout is on today’s plan.');
    } catch {
      setIsSaving(false);
      Alert.alert(
        'Couldn’t add to today',
        'Check your connection and try again, or close and reopen the app.',
      );
    }
  };

  const deleteWorkout = async () => {
    if (editingId == null) {
      return;
    }
    if (isSaving) {
      return;
    }
    setSavingLabel('delete');
    setIsSaving(true);
    try {
      const list = await loadSavedWorkouts();
      const next = list.filter((w) => w.id !== editingId);
      await saveSavedWorkouts(next);
      exitToWorkoutList();
    } catch {
      setIsSaving(false);
      Alert.alert(
        'Couldn’t delete workout',
        'Check your connection and try again, or close and reopen the app.',
      );
    }
  };

  const openDeleteConfirm = () => {
    if (editingId == null || isSaving) {
      return;
    }
    Keyboard.dismiss();
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteWorkout = () => {
    setDeleteConfirmVisible(false);
    void deleteWorkout();
  };

  const renderSectionList = (
    rows: ExerciseRow[],
    setRows: React.Dispatch<React.SetStateAction<ExerciseRow[]>>,
    updateForm: (index: number, next: ExerciseFormInput) => void,
    removeRow: (index: number) => void,
    emptyHint: string,
  ) => {
    if (rows.length === 0) {
      return <Text style={styles.sectionEmpty}>{emptyHint}</Text>;
    }
    return (
      <DraggableFlatList
        scrollEnabled={false}
        nestedScrollEnabled
        simultaneousHandlers={formScrollRef}
        data={rows}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => setRows(data)}
        onDragBegin={() => Keyboard.dismiss()}
        renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<ExerciseRow>) => {
          const index = getIndex() ?? 0;
          return (
            <ScaleDecorator>
              <ExerciseEditorCard
                index={index}
                value={item.form}
                onChange={(next) => updateForm(index, next)}
                onRemove={() => removeRow(index)}
                canRemove={rows.length >= 1}
                onDrag={drag}
                isDragging={isActive}
              />
            </ScaleDecorator>
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <VinlandModalOverlay
        visible={isSaving}
        title={
          savingLabel === 'delete'
            ? 'Deleting workout…'
            : savingLabel === 'add'
              ? 'Adding to today…'
              : 'Saving workout…'
        }
      />
      <VinlandConfirmDialog
        visible={deleteConfirmVisible && !isSaving}
        title="Delete this workout?"
        message="This will remove it from your library."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={confirmDeleteWorkout}
      />
      <GestureScrollView
        ref={formScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.sub}>
          Name the workout, then build each section. Long-press the three dashes on a card
          to drag and reorder within that section. Cardio can use timed intervals (Timer
          tab), distance intervals (no timer), or steady distance with pace.
        </Text>

        <VinlandInput
          label="Workout name"
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Push Day"
          editable={!isSaving}
          containerStyle={styles.field}
        />

        <VinlandInput
          label="Workout notes (optional)"
          value={workoutDescription}
          onChangeText={setWorkoutDescription}
          placeholder="e.g. training for explosiveness"
          multiline
          textAlignVertical="top"
          editable={!isSaving}
          style={styles.descInput}
          containerStyle={styles.field}
        />

        <Text style={styles.sectionTitle}>Warm up</Text>
        {renderSectionList(
          warmUpRows,
          setWarmUpRows,
          updateWarmUpForm,
          removeWarmUp,
          'No warm-up exercises. Tap below to add one.',
        )}
        <Pressable
          onPress={() => setWarmUpRows((p) => [...p, newExerciseRow()])}
          style={({ pressed }) => [styles.addExerciseBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise to Warm Up</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Workout</Text>
        {renderSectionList(
          workoutRows,
          setWorkoutRows,
          updateWorkoutForm,
          removeWorkout,
          'No main exercises yet. Tap below to add one.',
        )}
        <Pressable
          onPress={() => setWorkoutRows((p) => [...p, newExerciseRow()])}
          style={({ pressed }) => [styles.addExerciseBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise to Workout</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Cool down</Text>
        {renderSectionList(
          coolDownRows,
          setCoolDownRows,
          updateCoolDownForm,
          removeCoolDown,
          'No cool-down exercises. Tap below to add one.',
        )}
        <Pressable
          onPress={() => setCoolDownRows((p) => [...p, newExerciseRow()])}
          style={({ pressed }) => [styles.addExerciseBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise to Cool Down</Text>
        </Pressable>

        <View style={styles.actions}>
          <VinlandButton
            title={editingId != null ? 'Save Changes' : 'Save Workout'}
            onPress={() => void saveWorkoutToLibrary()}
            disabled={isSaving}
            variant="primary"
          />

          <View style={styles.actionSpacer} />
          <VinlandButton
            title="Add to Today"
            onPress={() => void addToToday()}
            disabled={isSaving}
            variant="secondary"
          />

          {editingId != null ? (
            <>
              <View style={styles.actionSpacer} />
              <VinlandButton
                title="Delete Workout"
                onPress={openDeleteConfirm}
                disabled={isSaving}
                variant="destructive"
              />
            </>
          ) : null}
        </View>
      </GestureScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: V.space.sm,
    paddingHorizontal: V.space.xl,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: V.space.lg,
    lineHeight: 21,
  },
  field: { marginBottom: V.space.md },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: V.text,
    marginTop: V.space.md,
    marginBottom: V.space.sm,
    letterSpacing: 0.3,
  },
  sectionEmpty: {
    fontSize: 14,
    color: V.textSecondary,
    marginBottom: V.space.sm,
    lineHeight: 20,
  },
  descInput: {
    fontSize: 16,
    color: V.text,
    minHeight: 88,
    lineHeight: 22,
  },
  addExerciseBtn: {
    alignSelf: 'flex-start',
    marginBottom: V.space.lg,
    paddingVertical: 8,
  },
  addExerciseText: {
    fontSize: 17,
    color: V.link,
    fontWeight: '400',
  },
  actions: {
    marginTop: V.space.sm,
    marginBottom: V.space.md,
  },
  actionSpacer: { height: V.space.sm },
  pressed: {
    opacity: 0.85,
  },
});
