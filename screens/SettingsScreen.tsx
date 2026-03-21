import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import type { ActivityLevel, WeightGoalState } from '../utils/storage';
import { loadData, loadWeightGoal } from '../utils/storage';
import { commitWeightGoalForMode } from '../utils/weightGoalCommit';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: 'inactive', label: 'Inactive', hint: 'Little or no exercise' },
  { value: 'active', label: 'Active', hint: 'Regular movement or training' },
  {
    value: 'extremely_active',
    label: 'Extremely active',
    hint: 'Hard training or physical job',
  },
];

export default function SettingsScreen() {
  const {
    displayName,
    workoutsPerWeek,
    activityLevel,
    dailyCalorieGoal,
    setDisplayName,
    setWorkoutsPerWeek,
    setActivityLevel,
    setDailyCalorieGoal,
  } = useUserPrefs();

  const [nameDraft, setNameDraft] = useState(displayName ?? '');
  const [calorieDraft, setCalorieDraft] = useState(String(dailyCalorieGoal));
  const [weightGoal, setWeightGoalState] = useState<WeightGoalState | null>(null);
  const [days, setDays] = useState<Awaited<ReturnType<typeof loadData>>>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [loaded, goal] = await Promise.all([loadData(), loadWeightGoal()]);
        if (!cancelled) {
          setDays(loaded);
          setWeightGoalState(goal);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    setNameDraft(displayName ?? '');
  }, [displayName]);

  const saveName = async () => {
    const t = nameDraft.trim();
    if (t.length === 0) {
      Alert.alert('Name required', 'Enter a name or nickname to continue.');
      return;
    }
    await setDisplayName(t);
    Alert.alert('Saved', 'Your display name was updated.');
  };

  const onDaysPick = async (n: number) => {
    await setWorkoutsPerWeek(n);
  };

  const onActivityPick = async (level: ActivityLevel) => {
    await setActivityLevel(level);
  };

  const saveCalorieGoal = async () => {
    const n = parseInt(calorieDraft.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 800 || n > 20000) {
      Alert.alert(
        'Check value',
        'Enter a daily calorie goal between 800 and 20,000.',
      );
      return;
    }
    await setDailyCalorieGoal(n);
    Alert.alert('Saved', 'Your daily calorie goal was updated.');
  };

  const onWeightGoal = async (mode: 'lose' | 'gain') => {
    const result = await commitWeightGoalForMode(mode, days, weightGoal);
    if (!result.ok) {
      Alert.alert(
        'Log your weight',
        'Add a weight entry on the Home tab so we can set a starting baseline.',
      );
      return;
    }
    if ('unchanged' in result) {
      return;
    }
    setWeightGoalState(result.state);
    Alert.alert(
      'Goal updated',
      mode === 'lose'
        ? 'Cutting baseline set from your latest weight log.'
        : 'Bulking baseline set from your latest weight log.',
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Display name</Text>
          <Text style={styles.hint}>Shown on your home welcome line.</Text>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Your name"
            placeholderTextColor={V.placeholder}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => void saveName()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Save name</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
            Daily calorie goal
          </Text>
          <Text style={styles.hint}>
            Used for the Nutrition section on Home (hit goal + optional calories over).
          </Text>
          <TextInput
            value={calorieDraft}
            onChangeText={(t) => setCalorieDraft(t.replace(/[^\d]/g, ''))}
            placeholder="e.g. 2200"
            placeholderTextColor={V.placeholder}
            style={styles.input}
            keyboardType="number-pad"
          />
          <Pressable
            onPress={() => void saveCalorieGoal()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Save calorie goal</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
            Workouts per week
          </Text>
          <Text style={styles.hint}>Target training days you&apos;re aiming for.</Text>
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const selected = workoutsPerWeek === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => void onDaysPick(n)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected ? styles.chipSelected : styles.chipIdle,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={selected ? styles.chipTextSelected : styles.chipTextIdle}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Activity level</Text>
          <Text style={styles.hint}>How active you are outside structured workouts.</Text>
          {ACTIVITY_OPTIONS.map((opt) => {
            const selected = activityLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => void onActivityPick(opt.value)}
                style={({ pressed }) => [
                  styles.optionCard,
                  selected ? styles.optionCardSelected : styles.optionCardIdle,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={selected ? styles.optionTitleSelected : styles.optionTitleIdle}
                >
                  {opt.label}
                </Text>
                <Text
                  style={selected ? styles.optionHintSelected : styles.optionHintIdle}
                >
                  {opt.hint}
                </Text>
              </Pressable>
            );
          })}

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Weight goal</Text>
          <Text style={styles.hint}>
            Cutting and bulking track change from your latest logged weight whenever you
            switch or set a goal.
          </Text>
          {weightGoal == null ? (
            <Text style={styles.muted}>
              No goal set yet. Choose below after you&apos;ve logged weight on Home.
            </Text>
          ) : (
            <View style={styles.currentGoal}>
              <Text style={styles.currentGoalLabel}>Current</Text>
              <Text style={styles.currentGoalValue}>
                {weightGoal.mode === 'lose' ? 'Cutting' : 'Bulking'} · baseline{' '}
                {weightGoal.baselineWeightLb.toFixed(1)} lb
              </Text>
            </View>
          )}
          <View style={styles.goalRow}>
            <Pressable
              onPress={() => void onWeightGoal('lose')}
              style={({ pressed }) => [
                styles.goalChoice,
                weightGoal?.mode === 'lose'
                  ? styles.goalChoiceSelected
                  : styles.goalChoiceIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={
                  weightGoal?.mode === 'lose'
                    ? styles.goalTitleSelected
                    : styles.goalTitleIdle
                }
              >
                Cutting
              </Text>
              <Text
                style={
                  weightGoal?.mode === 'lose'
                    ? styles.goalHintSelected
                    : styles.goalHintIdle
                }
              >
                Losing weight
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onWeightGoal('gain')}
              style={({ pressed }) => [
                styles.goalChoice,
                weightGoal?.mode === 'gain'
                  ? styles.goalChoiceSelected
                  : styles.goalChoiceIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={
                  weightGoal?.mode === 'gain'
                    ? styles.goalTitleSelected
                    : styles.goalTitleIdle
                }
              >
                Bulking
              </Text>
              <Text
                style={
                  weightGoal?.mode === 'gain'
                    ? styles.goalHintSelected
                    : styles.goalHintIdle
                }
              >
                Gaining weight
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionSpaced: {
    marginTop: 28,
  },
  hint: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: V.accent,
    paddingVertical: 14,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: V.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderHairline,
    backgroundColor: V.bg,
  },
  chipSelected: {
    borderWidth: V.outlineWidthActive,
    borderColor: V.accent,
    backgroundColor: V.surfaceComplete,
  },
  chipTextIdle: {
    fontSize: 17,
    fontWeight: '600',
    color: V.textDim,
  },
  chipTextSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: V.accent,
  },
  optionCard: {
    padding: 16,
    marginBottom: 10,
  },
  optionCardIdle: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderHairline,
    backgroundColor: V.bg,
  },
  optionCardSelected: {
    borderWidth: V.outlineWidthActive,
    borderColor: V.accent,
    backgroundColor: V.surfaceComplete,
  },
  optionTitleIdle: {
    fontSize: 17,
    fontWeight: '600',
    color: V.textTertiary,
  },
  optionTitleSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: V.accent,
  },
  optionHintIdle: {
    fontSize: 14,
    color: V.textDim,
    marginTop: 4,
    lineHeight: 20,
  },
  optionHintSelected: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  muted: {
    fontSize: 14,
    color: V.textTertiary,
    lineHeight: 20,
    marginBottom: 12,
  },
  currentGoal: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    padding: 14,
    marginBottom: 12,
    backgroundColor: V.bgElevated,
  },
  currentGoalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentGoalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: V.text,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalChoice: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  goalChoiceIdle: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderHairline,
    backgroundColor: V.bg,
  },
  goalChoiceSelected: {
    borderWidth: V.outlineWidthActive,
    borderColor: V.accent,
    backgroundColor: V.surfaceComplete,
  },
  goalTitleIdle: {
    fontSize: 16,
    fontWeight: '600',
    color: V.textTertiary,
  },
  goalTitleSelected: {
    fontSize: 16,
    fontWeight: '700',
    color: V.accent,
  },
  goalHintIdle: {
    fontSize: 13,
    color: V.textDim,
    marginTop: 4,
  },
  goalHintSelected: {
    fontSize: 13,
    color: V.textSecondary,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.88,
  },
});
