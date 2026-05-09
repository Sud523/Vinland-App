/**
 * Full-screen first-run wizard (modal): name, training prefs, optional weight goal commit.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import { VinlandButton } from './ui/VinlandButton';
import { VinlandCard } from './ui/VinlandCard';
import { VinlandInput } from './ui/VinlandInput';
import { loadData, loadWeightGoal, type ActivityLevel, type WeightGoalMode } from '../utils/storage';
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

/** Renders only while `onboardingComplete` is false after prefs hydrate; advances persisted steps. */
export function FirstLaunchOnboarding() {
  const {
    displayName,
    workoutsPerWeek,
    activityLevel,
    dailyCalorieGoal,
    prefsLoaded,
    onboardingComplete,
    onboardingStep: savedStep,
    setDisplayName,
    setWorkoutsPerWeek,
    setActivityLevel,
    setDailyCalorieGoal,
    setOnboardingComplete,
    setOnboardingStep,
    clearOnboardingStep,
  } = useUserPrefs();

  const [step, setStep] = useState(0);
  const [stepReady, setStepReady] = useState(false);
  const [nameText, setNameText] = useState('');
  const [daysPick, setDaysPick] = useState(workoutsPerWeek);
  const [activityPick, setActivityPick] = useState<ActivityLevel>(activityLevel);
  const [calorieText, setCalorieText] = useState(String(dailyCalorieGoal));
  const [busy, setBusy] = useState(false);
  /** Highlights Cutting / Bulking like Settings before async finish. */
  const [goalHighlight, setGoalHighlight] = useState<'lose' | 'gain' | null>(null);

  useEffect(() => {
    if (!prefsLoaded || onboardingComplete) {
      return;
    }
    setStep(savedStep);
    setStepReady(true);
  }, [prefsLoaded, onboardingComplete, savedStep]);

  useEffect(() => {
    if (displayName) {
      setNameText(displayName);
    }
  }, [displayName]);

  useEffect(() => {
    setDaysPick(workoutsPerWeek);
  }, [workoutsPerWeek]);

  useEffect(() => {
    setActivityPick(activityLevel);
  }, [activityLevel]);

  useEffect(() => {
    setCalorieText(String(dailyCalorieGoal));
  }, [dailyCalorieGoal]);

  useEffect(() => {
    setGoalHighlight(null);
  }, [step]);

  const calorieInputValid = useMemo(() => {
    const n = parseInt(calorieText.replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n >= 800 && n <= 20000;
  }, [calorieText]);

  if (!prefsLoaded || onboardingComplete) {
    return null;
  }

  if (!stepReady) {
    return (
      <Modal visible animationType="fade" presentationStyle="fullScreen">
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={V.text} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const onNameContinue = async () => {
    const t = nameText.trim();
    if (t.length === 0 || busy) {
      return;
    }
    setBusy(true);
    try {
      await setDisplayName(t);
      await setOnboardingStep(1);
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const onWorkoutsContinue = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await setWorkoutsPerWeek(daysPick);
      await setOnboardingStep(2);
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const onActivityContinue = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await setActivityLevel(activityPick);
      await setOnboardingStep(3);
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const onCaloriesContinue = async () => {
    const n = parseInt(calorieText.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 800 || n > 20000) {
      return;
    }
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await setDailyCalorieGoal(n);
      await setOnboardingStep(4);
      setStep(4);
    } finally {
      setBusy(false);
    }
  };

  const finishOnboarding = async () => {
    await clearOnboardingStep();
    await setOnboardingComplete(true);
  };

  const onGoalFinish = async (mode: WeightGoalMode) => {
    if (busy) {
      return;
    }
    setGoalHighlight(mode);
    setBusy(true);
    try {
      const days = await loadData();
      const current = await loadWeightGoal();
      await commitWeightGoalForMode(mode, days, current);
      await finishOnboarding();
    } finally {
      setBusy(false);
    }
  };

  const onSkipGoal = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await finishOnboarding();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.inner}>
            {step === 0 ? (
              <>
                <Text style={styles.title}>Welcome to Vinland</Text>
                <Text style={styles.sub}>
                  What would you like to be called? You can use your first name or any
                  nickname.
                </Text>
                <VinlandCard padded>
                  <VinlandInput
                    label="Your name"
                    value={nameText}
                    onChangeText={setNameText}
                    placeholder="e.g. Alex"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => void onNameContinue()}
                    editable={!busy}
                    containerStyle={styles.field}
                  />
                  <VinlandButton
                    title={busy ? 'Working…' : 'Continue'}
                    onPress={() => void onNameContinue()}
                    disabled={nameText.trim().length === 0 || busy}
                    variant="primary"
                  />
                </VinlandCard>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={styles.title}>Training days</Text>
                <Text style={styles.sub}>
                  How many days per week do you want to work out?
                </Text>
                <View style={styles.chipRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                    const selected = daysPick === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setDaysPick(n)}
                        style={({ pressed }) => [
                          styles.chip,
                          selected ? styles.chipSelected : styles.chipIdle,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <Text
                          style={
                            selected ? styles.chipTextSelected : styles.chipTextIdle
                          }
                        >
                          {n}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <VinlandButton
                  title={busy ? 'Working…' : 'Continue'}
                  onPress={() => void onWorkoutsContinue()}
                  disabled={busy}
                  variant="primary"
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.title}>Activity level</Text>
                <Text style={styles.sub}>
                  How active you are day to day—not just workouts. Pick what fits you now.
                </Text>
                {ACTIVITY_OPTIONS.map((opt) => {
                  const selected = activityPick === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setActivityPick(opt.value)}
                      style={({ pressed }) => [
                        styles.optionCard,
                        selected
                          ? styles.optionCardSelected
                          : styles.optionCardIdle,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text
                        style={
                          selected
                            ? styles.optionTitleSelected
                            : styles.optionTitleIdle
                        }
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={
                          selected
                            ? styles.optionHintSelected
                            : styles.optionHintIdle
                        }
                      >
                        {opt.hint}
                      </Text>
                    </Pressable>
                  );
                })}
                <VinlandButton
                  title={busy ? 'Working…' : 'Continue'}
                  onPress={() => void onActivityContinue()}
                  disabled={busy}
                  variant="primary"
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.title}>Daily calories</Text>
                <Text style={styles.sub}>
                  About how many calories you aim for each day. You can change this anytime
                  in Settings.
                </Text>
                <VinlandCard padded>
                  <VinlandInput
                    label="Calorie goal"
                    value={calorieText}
                    onChangeText={(t) => setCalorieText(t.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 2200"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => void onCaloriesContinue()}
                    editable={!busy}
                    style={styles.inputCalories}
                    containerStyle={styles.field}
                  />
                <Text style={styles.calorieRangeHint}>Use a number between 800 and 20,000</Text>
                  <VinlandButton
                    title={busy ? 'Working…' : 'Continue'}
                    onPress={() => void onCaloriesContinue()}
                    disabled={busy || !calorieInputValid}
                    variant="primary"
                  />
                </VinlandCard>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text style={styles.title}>Weight direction</Text>
                <Text style={styles.sub}>
                  Are you mainly trying to lose weight or gain weight? If you haven&apos;t
                  logged weight on Home yet, you can skip this and set it later in Settings—we&apos;ll
                  use your latest weigh-in when you&apos;re ready.
                </Text>
                {busy ? (
                  <ActivityIndicator size="large" color={V.text} style={styles.goalBusy} />
                ) : (
                  <>
                    <View style={styles.goalRow}>
                      <Pressable
                        onPress={() => void onGoalFinish('lose')}
                        style={({ pressed }) => [
                          styles.goalChoice,
                          goalHighlight === 'lose'
                            ? styles.goalChoiceSelected
                            : styles.goalChoiceIdle,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <Text
                          style={
                            goalHighlight === 'lose'
                              ? styles.goalTitleSelected
                              : styles.goalTitleIdle
                          }
                        >
                          Cutting
                        </Text>
                        <Text
                          style={
                            goalHighlight === 'lose'
                              ? styles.goalHintSelected
                              : styles.goalHintIdle
                          }
                        >
                          Losing weight
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void onGoalFinish('gain')}
                        style={({ pressed }) => [
                          styles.goalChoice,
                          goalHighlight === 'gain'
                            ? styles.goalChoiceSelected
                            : styles.goalChoiceIdle,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <Text
                          style={
                            goalHighlight === 'gain'
                              ? styles.goalTitleSelected
                              : styles.goalTitleIdle
                          }
                        >
                          Bulking
                        </Text>
                        <Text
                          style={
                            goalHighlight === 'gain'
                              ? styles.goalHintSelected
                              : styles.goalHintIdle
                          }
                        >
                          Gaining weight
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => void onSkipGoal()}
                      style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
                    >
                      <Text style={styles.skipText}>Set later in Settings</Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: V.space.xl,
    paddingTop: V.space.xxxl,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: V.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 16,
    color: V.textSecondary,
    lineHeight: 23,
    marginBottom: 28,
  },
  field: { marginBottom: V.space.md },
  input: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 24,
  },
  inputCalories: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 10,
  },
  calorieRangeHint: {
    fontSize: 14,
    color: V.textSecondary,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: V.runeGlow,
    paddingVertical: 16,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnText: {
    color: V.bg,
    fontSize: 17,
    fontWeight: '400',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
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
    borderColor: V.runeGlowMuted,
    backgroundColor: V.surfaceComplete,
  },
  chipTextIdle: {
    fontSize: 17,
    fontWeight: '400',
    color: V.textDim,
  },
  chipTextSelected: {
    fontSize: 17,
    fontWeight: '400',
    color: V.runeGlow,
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
    borderColor: V.runeGlowMuted,
    backgroundColor: V.surfaceComplete,
  },
  optionTitleIdle: {
    fontSize: 17,
    fontWeight: '400',
    color: V.textTertiary,
  },
  optionTitleSelected: {
    fontSize: 17,
    fontWeight: '400',
    color: V.runeGlow,
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
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalChoice: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
  },
  goalChoiceIdle: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderHairline,
    backgroundColor: V.bg,
  },
  goalChoiceSelected: {
    borderWidth: V.outlineWidthActive,
    borderColor: V.runeGlowMuted,
    backgroundColor: V.surfaceComplete,
  },
  goalTitleIdle: {
    fontSize: 16,
    fontWeight: '400',
    color: V.textTertiary,
  },
  goalTitleSelected: {
    fontSize: 16,
    fontWeight: '400',
    color: V.runeGlow,
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
  goalBusy: {
    marginVertical: 32,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '400',
    color: V.link,
  },
});
