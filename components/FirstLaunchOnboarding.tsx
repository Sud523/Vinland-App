import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import {
  clearOnboardingStep,
  loadData,
  loadOnboardingStep,
  loadWeightGoal,
  saveOnboardingStep,
  type ActivityLevel,
  type WeightGoalMode,
} from '../utils/storage';
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

export function FirstLaunchOnboarding() {
  const {
    displayName,
    workoutsPerWeek,
    activityLevel,
    dailyCalorieGoal,
    prefsLoaded,
    onboardingComplete,
    setDisplayName,
    setWorkoutsPerWeek,
    setActivityLevel,
    setDailyCalorieGoal,
    setOnboardingComplete,
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
    let cancelled = false;
    void loadOnboardingStep().then((s) => {
      if (!cancelled) {
        setStep(s);
        setStepReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [prefsLoaded, onboardingComplete]);

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
      await saveOnboardingStep(1);
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
      await saveOnboardingStep(2);
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
      await saveOnboardingStep(3);
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
      await saveOnboardingStep(4);
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
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  value={nameText}
                  onChangeText={setNameText}
                  placeholder="e.g. Alex"
                  placeholderTextColor={V.placeholder}
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void onNameContinue()}
                  editable={!busy}
                />
                <Pressable
                  onPress={() => void onNameContinue()}
                  disabled={nameText.trim().length === 0 || busy}
                  style={({ pressed }) => [
                    styles.btn,
                    (nameText.trim().length === 0 || busy) && styles.btnDisabled,
                    pressed && nameText.trim().length > 0 && !busy && styles.btnPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={V.bg} />
                  ) : (
                    <Text style={styles.btnText}>Continue</Text>
                  )}
                </Pressable>
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
                <Pressable
                  onPress={() => void onWorkoutsContinue()}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.btn,
                    busy && styles.btnDisabled,
                    pressed && !busy && styles.btnPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={V.bg} />
                  ) : (
                    <Text style={styles.btnText}>Continue</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.title}>Activity level</Text>
                <Text style={styles.sub}>
                  This helps us frame expectations. Pick what fits best right now.
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
                <Pressable
                  onPress={() => void onActivityContinue()}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.btn,
                    busy && styles.btnDisabled,
                    pressed && !busy && styles.btnPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={V.bg} />
                  ) : (
                    <Text style={styles.btnText}>Continue</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.title}>Daily calories</Text>
                <Text style={styles.sub}>
                  Target calories per day for nutrition tracking on Home. You can change
                  this anytime in Settings.
                </Text>
                <Text style={styles.label}>Calorie goal</Text>
                <TextInput
                  value={calorieText}
                  onChangeText={(t) => setCalorieText(t.replace(/[^\d]/g, ''))}
                  placeholder="e.g. 2200"
                  placeholderTextColor={V.placeholder}
                  style={styles.inputCalories}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => void onCaloriesContinue()}
                  editable={!busy}
                />
                <Text style={styles.calorieRangeHint}>Between 800 and 20,000</Text>
                <Pressable
                  onPress={() => void onCaloriesContinue()}
                  disabled={busy || !calorieInputValid}
                  style={({ pressed }) => [
                    styles.btn,
                    (busy || !calorieInputValid) && styles.btnDisabled,
                    pressed && !busy && calorieInputValid && styles.btnPressed,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={V.bg} />
                  ) : (
                    <Text style={styles.btnText}>Continue</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text style={styles.title}>Weight direction</Text>
                <Text style={styles.sub}>
                  Are you mainly cutting (losing) or bulking (gaining)? If you
                  haven&apos;t logged a weight on Home yet, you can set this later in
                  Settings—we&apos;ll use your latest log as a baseline when you do.
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
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
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
    backgroundColor: V.accent,
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
    fontWeight: '600',
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
  goalBusy: {
    marginVertical: 32,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: V.link,
  },
});
