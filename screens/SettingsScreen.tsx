/**
 * Profile editor: display name, weekly targets, calorie goal, cut/bulk baseline commits.
 */
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

import { useAuth } from '../context/AuthContext';
import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandCard } from '../components/ui/VinlandCard';
import { VinlandInput } from '../components/ui/VinlandInput';
import { VinlandSectionHeader } from '../components/ui/VinlandSectionHeader';
import { confirmAction, confirmDestructive } from '../utils/confirmDestructive';
import { importMergeLocalDeviceData } from '../utils/importLocalDeviceData';
import type { ActivityLevel, WeightGoalState } from '../utils/storage';
import { loadData, loadWeightGoal } from '../utils/storage';
import type { RootStackParamList } from '../navigation/types';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut, deleteAccount, user } = useAuth();
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
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [deviceImportBusy, setDeviceImportBusy] = useState(false);

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
      Alert.alert('Add a name', 'Enter a name or nickname to continue.');
      return;
    }
    await setDisplayName(t);
    Alert.alert('Saved', 'Your name was updated.');
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
        'Check that number',
        'Enter a daily calorie target between 800 and 20,000.',
      );
      return;
    }
    await setDailyCalorieGoal(n);
    Alert.alert('Saved', 'Your calorie goal was updated.');
  };

  const onWeightGoal = async (mode: 'lose' | 'gain') => {
    const result = await commitWeightGoalForMode(mode, days, weightGoal);
    if (!result.ok) {
      Alert.alert(
        'Log your weight first',
        'Add your weight on the Home tab, then come back here to set your goal.',
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
        ? 'We’ll track progress from your latest weight toward losing fat.'
        : 'We’ll track progress from your latest weight toward gaining muscle.',
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
          <VinlandSectionHeader title="Display name" style={styles.sectionHeaderFirst} />
          <Text style={styles.hint}>This is how we greet you on Home.</Text>
          <VinlandCard padded style={styles.card}>
            <VinlandInput
              label="Your name"
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              autoCapitalize="words"
              autoCorrect={false}
              containerStyle={styles.field}
            />
            <VinlandButton title="Save Name" onPress={() => void saveName()} variant="primary" />
          </VinlandCard>

          <VinlandSectionHeader title="Daily calorie goal" />
          <Text style={styles.hint}>
            Used on Home when you track calories and your nutrition goals.
          </Text>
          <VinlandCard padded style={styles.card}>
            <VinlandInput
              label="Calories"
              value={calorieDraft}
              onChangeText={(t) => setCalorieDraft(t.replace(/[^\d]/g, ''))}
              placeholder="e.g. 2200"
              keyboardType="number-pad"
              containerStyle={styles.field}
            />
            <VinlandButton
              title="Save Calorie Goal"
              onPress={() => void saveCalorieGoal()}
              variant="primary"
            />
          </VinlandCard>

          <VinlandSectionHeader title="Workouts per week" />
          <Text style={styles.hint}>How many days per week you plan to train.</Text>
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

          <VinlandSectionHeader title="Activity level" />
          <Text style={styles.hint}>How much you move outside of planned workouts.</Text>
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

          <VinlandSectionHeader title="Weight goal" />
          <Text style={styles.hint}>
            We compare your latest weight to a starting point when you choose lose or gain.
          </Text>
          {weightGoal == null ? (
            <Text style={styles.muted}>
              No goal yet. Log your weight on Home first, or pick an option below.
            </Text>
          ) : (
            <VinlandCard padded style={styles.currentGoal}>
              <Text style={styles.currentGoalLabel}>Current</Text>
              <Text style={styles.currentGoalValue}>
                {weightGoal.mode === 'lose' ? 'Cutting' : 'Bulking'} · starting weight{' '}
                {weightGoal.baselineWeightLb.toFixed(1)} lb
              </Text>
            </VinlandCard>
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

          <VinlandSectionHeader title="Statistics" />
          <Text style={styles.hint}>
            Reset journal or profile data that feeds the Stats tab, one metric at a time.
          </Text>
          <VinlandButton
            title="Statistics data"
            variant="secondary"
            disabled={accountActionBusy || deviceImportBusy}
            style={styles.btnStacked}
            onPress={() => navigation.navigate('StatisticsSettings')}
          />

          <VinlandSectionHeader title="This device" />
          <Text style={styles.hint}>
            Use this if you used Vinland on this phone before signing in elsewhere. We’ll add any
            workouts and journal days stored only on this device that aren’t already in your
            account—nothing on your account gets replaced.
          </Text>
          <VinlandButton
            title="Import from this device"
            variant="secondary"
            disabled={deviceImportBusy || accountActionBusy}
            onPress={() =>
              confirmAction(
                'Import from this device?',
                'We’ll copy workouts and journal days saved only on this phone into your account. Anything that already matches your account is left as-is.',
                'Import',
                async () => {
                  const uid = user?.id;
                  if (uid == null) {
                    return;
                  }
                  setDeviceImportBusy(true);
                  try {
                    const r = await importMergeLocalDeviceData(uid);
                    const loaded = await loadData();
                    setDays(loaded);
                    if (r.workoutTemplatesAdded === 0 && r.journalDaysAdded === 0) {
                      if (r.localWorkoutCount === 0 && r.localJournalDayCount === 0) {
                        Alert.alert(
                          'Nothing to import',
                          'We didn’t find any older Vinland data saved on this phone.',
                        );
                      } else {
                        Alert.alert(
                          'Already up to date',
                          'Everything on this phone is already in your account.',
                        );
                      }
                    } else {
                      const w = r.workoutTemplatesAdded;
                      const j = r.journalDaysAdded;
                      let body = '';
                      if (w > 0 && j > 0) {
                        body = `Added ${w} saved workout${w === 1 ? '' : 's'} and ${j} journal day${j === 1 ? '' : 's'}.`;
                      } else if (w > 0) {
                        body = `Added ${w} saved workout${w === 1 ? '' : 's'} to your library.`;
                      } else {
                        body = `Added ${j} journal day${j === 1 ? '' : 's'}.`;
                      }
                      Alert.alert('Import complete', body);
                    }
                  } catch {
                    Alert.alert(
                      'Couldn’t import',
                      'Check your internet connection and try again. If it keeps happening, try signing out and back in.',
                    );
                  } finally {
                    setDeviceImportBusy(false);
                  }
                },
              )
            }
            style={styles.btnStacked}
          />

          <VinlandSectionHeader title="Account" />
          <Text style={styles.hint}>
            Sign out on this phone or browser. Your data stays tied to your account online.
          </Text>
          <VinlandButton
            title="Sign out"
            variant="ghost"
            disabled={accountActionBusy || deviceImportBusy}
            onPress={() =>
              confirmDestructive(
                'Sign out',
                'You will need to sign in again to use Vinland on this device.',
                'Sign out',
                async () => {
                  setAccountActionBusy(true);
                  try {
                    await signOut();
                  } finally {
                    setAccountActionBusy(false);
                  }
                },
              )
            }
            style={styles.btnStacked}
          />

          <VinlandSectionHeader title="Danger zone" />
          <Text style={styles.hint}>
            Permanently delete your account and all Vinland data for it. This cannot be undone.
          </Text>
          <VinlandButton
            title="Delete account"
            variant="destructive"
            disabled={accountActionBusy || deviceImportBusy}
            onPress={() =>
              confirmDestructive(
                'Delete your account?',
                'Your login and all Vinland data for this account will be removed. You can’t undo this.',
                'Delete my account',
                async () => {
                  setAccountActionBusy(true);
                  try {
                    const { error } = await deleteAccount();
                    if (error != null) {
                      Alert.alert(
                        'Couldn’t delete account',
                        'Something went wrong on our side. Try again in a moment. If you host the app yourself, account deletion may need to be enabled on your backend.',
                      );
                    }
                  } finally {
                    setAccountActionBusy(false);
                  }
                },
              )
            }
            style={styles.btnStacked}
          />
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
    paddingHorizontal: V.space.xl,
    paddingBottom: V.space.xxxl,
  },
  sectionHeaderFirst: { marginTop: 0 },
  hint: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  card: { marginBottom: V.space.md },
  field: { marginBottom: V.space.md },
  btnStacked: { marginTop: V.space.sm },
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
  muted: {
    fontSize: 14,
    color: V.textTertiary,
    lineHeight: 20,
    marginBottom: 12,
  },
  currentGoal: {
    marginBottom: 12,
  },
  currentGoalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentGoalValue: {
    fontSize: 16,
    fontWeight: '400',
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
  pressed: { opacity: 0.88 },
});
