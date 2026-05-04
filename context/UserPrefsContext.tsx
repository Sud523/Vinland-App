/**
 * Profile + onboarding from Supabase `profiles` (1:1 with auth user).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';
import {
  DEFAULT_PROFILE_PREFS,
  type ActivityLevel,
  type ProfilePrefs,
} from '../utils/storage';

type UserPrefsContextValue = {
  displayName: string | null;
  workoutsPerWeek: number;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  onboardingComplete: boolean;
  onboardingStep: number;
  prefsLoaded: boolean;
  localDataMigratedAt: string | null;
  setDisplayName: (name: string) => Promise<void>;
  setWorkoutsPerWeek: (n: number) => Promise<void>;
  setActivityLevel: (level: ActivityLevel) => Promise<void>;
  setDailyCalorieGoal: (calories: number) => Promise<void>;
  updateProfilePrefs: (partial: Partial<ProfilePrefs>) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  setOnboardingStep: (step: number) => Promise<void>;
  clearOnboardingStep: () => Promise<void>;
  refreshFromProfile: () => Promise<void>;
  markLocalDataMigrated: () => Promise<void>;
};

const UserPrefsContext = createContext<UserPrefsContextValue | null>(null);

type ProfileRow = {
  display_name: string | null;
  workouts_per_week: number;
  activity_level: ActivityLevel;
  daily_calorie_goal: number;
  onboarding_complete: boolean;
  onboarding_step: number;
  local_data_migrated_at: string | null;
};

function rowToState(row: ProfileRow) {
  const mergedPrefs = {
    workoutsPerWeek: row.workouts_per_week ?? DEFAULT_PROFILE_PREFS.workoutsPerWeek,
    activityLevel: (row.activity_level ?? DEFAULT_PROFILE_PREFS.activityLevel) as ActivityLevel,
    dailyCalorieGoal: row.daily_calorie_goal ?? DEFAULT_PROFILE_PREFS.dailyCalorieGoal,
  };
  return {
    displayName: row.display_name?.trim() ? row.display_name.trim() : null,
    workoutsPerWeek: mergedPrefs.workoutsPerWeek,
    activityLevel: mergedPrefs.activityLevel,
    dailyCalorieGoal: mergedPrefs.dailyCalorieGoal,
    onboardingComplete: row.onboarding_complete === true,
    onboardingStep: Math.min(4, Math.max(0, row.onboarding_step ?? 0)),
    localDataMigratedAt: row.local_data_migrated_at,
  };
}

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [workoutsPerWeek, setWorkoutsPerWeekState] = useState(
    DEFAULT_PROFILE_PREFS.workoutsPerWeek,
  );
  const [activityLevel, setActivityLevelState] = useState<ActivityLevel>(
    DEFAULT_PROFILE_PREFS.activityLevel,
  );
  const [dailyCalorieGoal, setDailyCalorieGoalState] = useState(
    DEFAULT_PROFILE_PREFS.dailyCalorieGoal,
  );
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [onboardingStep, setOnboardingStepState] = useState(0);
  const [localDataMigratedAt, setLocalDataMigratedAt] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const refreshFromProfile = useCallback(async () => {
    if (uid == null) {
      return;
    }
    const { data: row, error } = await supabase
      .from('profiles')
      .select(
        'display_name, workouts_per_week, activity_level, daily_calorie_goal, onboarding_complete, onboarding_step, local_data_migrated_at',
      )
      .eq('id', uid)
      .maybeSingle();

    if (error || row == null) {
      setPrefsLoaded(true);
      return;
    }

    const r = row as ProfileRow;
    const s = rowToState(r);
    setDisplayNameState(s.displayName);
    setWorkoutsPerWeekState(s.workoutsPerWeek);
    setActivityLevelState(s.activityLevel);
    setDailyCalorieGoalState(s.dailyCalorieGoal);
    setOnboardingCompleteState(s.onboardingComplete);
    setOnboardingStepState(s.onboardingStep);
    setLocalDataMigratedAt(s.localDataMigratedAt);
    setPrefsLoaded(true);
  }, [uid]);

  useEffect(() => {
    if (uid == null) {
      setPrefsLoaded(false);
      return;
    }
    let cancelled = false;
    void refreshFromProfile().then(() => {
      if (cancelled) {
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid, refreshFromProfile]);

  const patchProfile = useCallback(
    async (partial: Record<string, unknown>) => {
      if (uid == null) {
        return;
      }
      const { error } = await supabase.from('profiles').update(partial).eq('id', uid);
      if (error) {
        throw error;
      }
      await refreshFromProfile();
    },
    [uid, refreshFromProfile],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      const t = name.trim();
      if (t.length === 0) {
        return;
      }
      await patchProfile({ display_name: t });
    },
    [patchProfile],
  );

  const setWorkoutsPerWeek = useCallback(
    async (n: number) => {
      const clamped = Math.min(7, Math.max(1, Math.round(n)));
      await patchProfile({ workouts_per_week: clamped });
    },
    [patchProfile],
  );

  const setActivityLevel = useCallback(
    async (level: ActivityLevel) => {
      await patchProfile({ activity_level: level });
    },
    [patchProfile],
  );

  const setDailyCalorieGoal = useCallback(
    async (calories: number) => {
      const clamped = Math.min(20000, Math.max(800, Math.round(calories)));
      await patchProfile({ daily_calorie_goal: clamped });
    },
    [patchProfile],
  );

  const updateProfilePrefs = useCallback(
    async (partial: Partial<ProfilePrefs>) => {
      const prevW = workoutsPerWeek;
      const prevA = activityLevel;
      const prevC = dailyCalorieGoal;
      const next: ProfilePrefs = {
        workoutsPerWeek: Math.min(
          7,
          Math.max(1, Math.round(partial.workoutsPerWeek ?? prevW)),
        ),
        activityLevel: partial.activityLevel ?? prevA,
        dailyCalorieGoal: Math.min(
          20000,
          Math.max(800, Math.round(partial.dailyCalorieGoal ?? prevC)),
        ),
      };
      await patchProfile({
        workouts_per_week: next.workoutsPerWeek,
        activity_level: next.activityLevel,
        daily_calorie_goal: next.dailyCalorieGoal,
      });
    },
    [patchProfile, workoutsPerWeek, activityLevel, dailyCalorieGoal],
  );

  const setOnboardingComplete = useCallback(
    async (complete: boolean) => {
      await patchProfile({ onboarding_complete: complete });
    },
    [patchProfile],
  );

  const setOnboardingStep = useCallback(
    async (step: number) => {
      const s = Math.min(4, Math.max(0, Math.round(step)));
      await patchProfile({ onboarding_step: s });
      setOnboardingStepState(s);
    },
    [patchProfile],
  );

  const clearOnboardingStep = useCallback(async () => {
    await patchProfile({ onboarding_step: 0 });
  }, [patchProfile]);

  const markLocalDataMigrated = useCallback(async () => {
    await patchProfile({ local_data_migrated_at: new Date().toISOString() });
  }, [patchProfile]);

  const value = useMemo(
    () => ({
      displayName,
      workoutsPerWeek,
      activityLevel,
      dailyCalorieGoal,
      onboardingComplete,
      onboardingStep,
      prefsLoaded,
      localDataMigratedAt,
      setDisplayName,
      setWorkoutsPerWeek,
      setActivityLevel,
      setDailyCalorieGoal,
      updateProfilePrefs,
      setOnboardingComplete,
      setOnboardingStep,
      clearOnboardingStep,
      refreshFromProfile,
      markLocalDataMigrated,
    }),
    [
      displayName,
      workoutsPerWeek,
      activityLevel,
      dailyCalorieGoal,
      onboardingComplete,
      onboardingStep,
      prefsLoaded,
      localDataMigratedAt,
      setDisplayName,
      setWorkoutsPerWeek,
      setActivityLevel,
      setDailyCalorieGoal,
      updateProfilePrefs,
      setOnboardingComplete,
      setOnboardingStep,
      clearOnboardingStep,
      refreshFromProfile,
      markLocalDataMigrated,
    ],
  );

  return (
    <UserPrefsContext.Provider value={value}>{children}</UserPrefsContext.Provider>
  );
}

export function useUserPrefs(): UserPrefsContextValue {
  const ctx = useContext(UserPrefsContext);
  if (ctx == null) {
    throw new Error('useUserPrefs must be used within UserPrefsProvider');
  }
  return ctx;
}
