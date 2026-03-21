import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
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
import type { Day, ExerciseFormInput, SavedWorkout } from '../types';
import { localDateKey } from '../utils/date';
import { loadData, loadSavedWorkouts, saveData, saveSavedWorkouts } from '../utils/storage';
import {
  emptyExerciseForm,
  exerciseDefinitionToFormInput,
  formsToDefinitions,
  newSavedWorkoutId,
  savedWorkoutToTasks,
} from '../utils/workouts';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutForm'>;

type ExerciseRow = { id: string; form: ExerciseFormInput };

function initialExerciseRows(): ExerciseRow[] {
  return [{ id: newSavedWorkoutId(), form: emptyExerciseForm() }];
}

export default function WorkoutFormScreen({ navigation, route }: Props) {
  const tabBarHeight = useBottomTabBarHeight();
  const editId = route.params?.editId;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [exerciseRows, setExerciseRows] = useState<ExerciseRow[]>(initialExerciseRows);

  const exerciseForms = exerciseRows.map((r) => r.form);

  const populateFromWorkout = useCallback((w: SavedWorkout) => {
    setEditingId(w.id);
    setWorkoutName(w.title);
    setWorkoutDescription(w.description ?? '');
    if (w.exercises.length === 0) {
      setExerciseRows(initialExerciseRows());
    } else {
      setExerciseRows(
        w.exercises.map((ex) => ({
          id: newSavedWorkoutId(),
          form: exerciseDefinitionToFormInput(ex),
        })),
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!editId) {
        setEditingId(null);
        setWorkoutName('');
        setWorkoutDescription('');
        setExerciseRows(initialExerciseRows());
        return () => {
          cancelled = true;
        };
      }

      setEditingId(null);
      setWorkoutName('');
      setWorkoutDescription('');
      setExerciseRows(initialExerciseRows());

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

  const updateForm = useCallback((index: number, next: ExerciseFormInput) => {
    setExerciseRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, form: next } : r)),
    );
  }, []);

  const addExerciseSlot = () => {
    setExerciseRows((prev) => [
      ...prev,
      { id: newSavedWorkoutId(), form: emptyExerciseForm() },
    ]);
  };

  const removeExerciseSlot = useCallback((index: number) => {
    setExerciseRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }, []);

  const onDragEnd = useCallback(({ data }: { data: ExerciseRow[] }) => {
    setExerciseRows(data);
  }, []);

  const validateWorkoutName = (): boolean => {
    if (!workoutName.trim()) {
      Alert.alert('Name your workout', 'Enter a name for this workout.');
      return false;
    }
    return true;
  };

  const parseExercises = () => {
    const result = formsToDefinitions(exerciseForms);
    if (!result.ok) {
      Alert.alert('Check exercises', result.message);
      return null;
    }
    return result.exercises;
  };

  const goBackToList = () => {
    navigation.goBack();
  };

  const saveWorkoutToLibrary = async () => {
    Keyboard.dismiss();
    if (!validateWorkoutName()) {
      return;
    }
    const exercises = parseExercises();
    if (!exercises) {
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
          const updated: SavedWorkout = { ...w, title, exercises };
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
          exercises,
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
    const exercises = parseExercises();
    if (!exercises) {
      return;
    }

    const newTasks = savedWorkoutToTasks({
      id: editingId ?? 'draft',
      title: workoutName.trim(),
      exercises,
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

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ExerciseRow>) => {
      const index = getIndex() ?? 0;
      return (
        <ScaleDecorator>
          <ExerciseEditorCard
            index={index}
            value={item.form}
            onChange={(next) => updateForm(index, next)}
            onRemove={() => removeExerciseSlot(index)}
            canRemove={exerciseRows.length > 1}
            onDrag={drag}
            isDragging={isActive}
          />
        </ScaleDecorator>
      );
    },
    [exerciseRows.length, removeExerciseSlot, updateForm],
  );

  const listHeader = (
    <View style={styles.scrollContent}>
      <Text style={styles.sub}>
        Name the workout, then set each exercise. Long-press the three dashes in the top
        left of a card to drag and reorder. Mark an exercise optional at the bottom of the
        card if it shouldn’t count toward daily progress or stats. Use Failure for reps to
        failure, or time-based blocks for intervals (e.g. Hard 4 min).
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

      <Text style={[styles.label, styles.exercisesLabel]}>Exercises</Text>
    </View>
  );

  const listFooter = (
    <View style={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}>
      <Pressable
        onPress={addExerciseSlot}
        style={({ pressed }) => [styles.addExerciseBtn, pressed && styles.pressed]}
      >
        <Text style={styles.addExerciseText}>+ Add another exercise</Text>
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
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <DraggableFlatList
        data={exerciseRows}
        keyExtractor={(item) => item.id}
        onDragEnd={onDragEnd}
        onDragBegin={() => Keyboard.dismiss()}
        activationDistance={12}
        containerStyle={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  scrollContent: {},
  exercisesLabel: {
    marginTop: 4,
    marginBottom: 4,
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
    marginBottom: 20,
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
