/**
 * Create or edit a `SavedWorkout`: warm up / workout / cool down exercise builders, validation, persist library.
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseEditorCard } from '../components/ExerciseEditorCard';
import { V } from '../constants/vinlandTheme';
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

  const [editingId, setEditingId] = useState<string | null>(null);
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
      Alert.alert('Name your workout', 'Enter a name for this workout.');
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

  const goBackToList = () => {
    navigation.goBack();
  };

  const saveWorkoutToLibrary = async () => {
    Keyboard.dismiss();
    if (!validateWorkoutName()) {
      return;
    }
    const parsed = parseSections();
    if (!parsed.ok) {
      Alert.alert('Check exercises', parsed.message);
      return;
    }

    const title = workoutName.trim();
    const descTrim = workoutDescription.trim();
    const description = descTrim.length > 0 ? descTrim : undefined;

    let list: SavedWorkout[];
    try {
      list = await loadSavedWorkouts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        'Could not load workouts',
        msg.length > 0
          ? msg
          : 'Storage failed to load. Try closing and reopening the app.',
      );
      return;
    }

    const currentEditId = editingId;

    try {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        'Could not save workout',
        msg.length > 0
          ? msg
          : 'Storage failed to save. Try closing and reopening the app.',
      );
      return;
    }

    goBackToList();
    Alert.alert(
      currentEditId != null ? 'Updated' : 'Saved',
      currentEditId != null
        ? 'Workout saved.'
        : 'Workout added to your library.',
    );
  };

  const addToToday = async () => {
    Keyboard.dismiss();
    if (!validateWorkoutName()) {
      return;
    }
    const parsed = parseSections();
    if (!parsed.ok) {
      Alert.alert('Check exercises', parsed.message);
      return;
    }

    const newTasks = savedWorkoutToTasks({
      id: editingId ?? 'draft',
      title: workoutName.trim(),
      warmUp: parsed.warmUp,
      workout: parsed.workout,
      coolDown: parsed.coolDown,
    });

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
      Alert.alert('Added', 'Workout added to today.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        'Could not add to today',
        msg.length > 0
          ? msg
          : 'Something went wrong. Try closing and reopening the app.',
      );
    }
  };

  const deleteWorkout = async () => {
    if (editingId == null) {
      return;
    }
    const list = await loadSavedWorkouts();
    const next = list.filter((w) => w.id !== editingId);
    await saveSavedWorkouts(next);
    goBackToList();
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
        data={rows}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => setRows(data)}
        onDragBegin={() => Keyboard.dismiss()}
        activationDistance={12}
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
      <ScrollView
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

        <Text style={styles.label}>Workout name</Text>
        <TextInput
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Push Day"
          placeholderTextColor={V.placeholder}
          style={styles.input}
        />

        <Text style={styles.label}>Workout notes (optional)</Text>
        <TextInput
          value={workoutDescription}
          onChangeText={setWorkoutDescription}
          placeholder="e.g. training for explosiveness"
          placeholderTextColor={V.placeholder}
          style={styles.descInput}
          multiline
          textAlignVertical="top"
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
          <Text style={styles.addExerciseText}>+ Add exercise to warm up</Text>
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
          <Text style={styles.addExerciseText}>+ Add exercise to workout</Text>
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
          <Text style={styles.addExerciseText}>+ Add exercise to cool down</Text>
        </Pressable>

        <Pressable
          onPressIn={() => Keyboard.dismiss()}
          onPress={() => void saveWorkoutToLibrary()}
          style={({ pressed }) => [styles.saveLibraryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveLibraryBtnText}>
            {editingId != null ? 'Save changes' : 'Save workout'}
          </Text>
        </Pressable>

        <Pressable
          onPressIn={() => Keyboard.dismiss()}
          onPress={() => void addToToday()}
          style={({ pressed }) => [styles.addTodayBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addTodayBtnText}>Add to today</Text>
        </Pressable>

        {editingId != null ? (
          <Pressable
            onPress={() => void deleteWorkout()}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
          >
            <Text style={styles.deleteBtnText}>Delete workout</Text>
          </Pressable>
        ) : null}
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
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: 20,
    lineHeight: 21,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: V.text,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionEmpty: {
    fontSize: 14,
    color: V.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
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
  descInput: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 16,
    minHeight: 88,
    lineHeight: 22,
  },
  addExerciseBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
  },
  addExerciseText: {
    fontSize: 17,
    color: V.link,
    fontWeight: '600',
  },
  saveLibraryBtn: {
    backgroundColor: V.accent,
    paddingVertical: 16,
    borderRadius: V.boxRadius,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    marginBottom: 12,
  },
  saveLibraryBtnText: {
    color: V.bg,
    fontSize: 17,
    fontWeight: '600',
  },
  addTodayBtn: {
    backgroundColor: V.bgElevated,
    paddingVertical: 16,
    borderRadius: V.boxRadius,
    alignItems: 'center',
    borderWidth: V.outlineWidth,
    borderColor: V.border,
  },
  addTodayBtnText: {
    color: V.link,
    fontSize: 17,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: V.destructive,
  },
  pressed: {
    opacity: 0.85,
  },
});
