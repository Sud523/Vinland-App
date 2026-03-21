import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskItem } from '../components/TaskItem';
import { Timer } from '../components/Timer';
import { WeightInput } from '../components/WeightInput';
import type { Day, Task } from '../types';
import { loadData, saveData } from '../utils/storage';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultTasksForNewDay(): Task[] {
  return [
    { name: 'Warm-up set', completed: false, duration: 300 },
    { name: 'Main lifts', completed: false },
    { name: 'Cool down', completed: false },
  ];
}

export default function HomeScreen() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);

  const date = todayKey();

  const todayIndex = useMemo(
    () => days.findIndex((d) => d.date === date),
    [days, date],
  );

  const today: Day | undefined = todayIndex >= 0 ? days[todayIndex] : undefined;

  const persist = useCallback(async (next: Day[]) => {
    setDays(next);
    await saveData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadData();
      if (cancelled) {
        return;
      }
      const idx = loaded.findIndex((d) => d.date === date);
      let next = [...loaded];
      if (idx < 0) {
        next.push({
          date,
          tasks: defaultTasksForNewDay(),
        });
      }
      setDays(next);
      if (idx < 0) {
        await saveData(next);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const handleToggleTask = (taskIndex: number) => {
    if (!today || todayIndex < 0) {
      return;
    }
    const tasks = today.tasks.map((t, i) =>
      i === taskIndex ? { ...t, completed: !t.completed } : t,
    );
    const next = [...days];
    next[todayIndex] = { ...today, tasks };
    void persist(next);
  };

  const handleWeightChange = (weight: number | undefined) => {
    if (!today || todayIndex < 0) {
      return;
    }
    const next = [...days];
    next[todayIndex] = { ...today, weight };
    void persist(next);
  };

  const timerDuration =
    today?.tasks.find((t) => t.duration != null && t.duration > 0)?.duration ??
    300;

  if (loading || !today) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Vinland</Text>
        <Text style={styles.subheading}>{date}</Text>

        <WeightInput weight={today.weight} onWeightChange={handleWeightChange} />

        <Timer duration={timerDuration} />

        <Text style={styles.sectionTitle}>Tasks</Text>
        {today.tasks.length === 0 ? (
          <Text style={styles.empty}>No tasks for today.</Text>
        ) : (
          today.tasks.map((task, index) => (
            <TaskItem
              key={`${task.name}-${index}`}
              name={task.name}
              completed={task.completed}
              onToggle={() => handleToggleTask(index)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  empty: {
    fontSize: 16,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
