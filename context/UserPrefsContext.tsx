import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_PROFILE_PREFS,
  loadDisplayName,
  loadOnboardingComplete,
  loadProfilePrefs,
  ONBOARDING_STEP_STORAGE_KEY,
  type ActivityLevel,
  type ProfilePrefs,
  saveDisplayName,
  saveOnboardingComplete,
  saveProfilePrefs,
} from '../utils/storage';

type UserPrefsContextValue = {
  displayName: string | null;
  workoutsPerWeek: number;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  onboardingComplete: boolean;
  prefsLoaded: boolean;
  setDisplayName: (name: string) => Promise<void>;
  setWorkoutsPerWeek: (n: number) => Promise<void>;
  setActivityLevel: (level: ActivityLevel) => Promise<void>;
  setDailyCalorieGoal: (calories: number) => Promise<void>;
  updateProfilePrefs: (partial: Partial<ProfilePrefs>) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  refreshFromStorage: () => Promise<void>;
};

const UserPrefsContext = createContext<UserPrefsContextValue | null>(null);

async function hydratePrefs(): Promise<{
  displayName: string | null;
  workoutsPerWeek: number;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  onboardingComplete: boolean;
}> {
  const [name, profile, onboarded, stepRaw] = await Promise.all([
    loadDisplayName(),
    loadProfilePrefs(),
    loadOnboardingComplete(),
    AsyncStorage.getItem(ONBOARDING_STEP_STORAGE_KEY),
  ]);

  let onboardingComplete = onboarded;

  if (!onboardingComplete && name != null && stepRaw == null) {
    await saveOnboardingComplete(true);
    const p = profile ?? DEFAULT_PROFILE_PREFS;
    await saveProfilePrefs(p);
    onboardingComplete = true;
  }

  const mergedProfile = profile ?? DEFAULT_PROFILE_PREFS;

  return {
    displayName: name,
    workoutsPerWeek: mergedProfile.workoutsPerWeek,
    activityLevel: mergedProfile.activityLevel,
    dailyCalorieGoal: mergedProfile.dailyCalorieGoal,
    onboardingComplete,
  };
}

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
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
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const refreshFromStorage = useCallback(async () => {
    const h = await hydratePrefs();
    setDisplayNameState(h.displayName);
    setWorkoutsPerWeekState(h.workoutsPerWeek);
    setActivityLevelState(h.activityLevel);
    setDailyCalorieGoalState(h.dailyCalorieGoal);
    setOnboardingCompleteState(h.onboardingComplete);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void hydratePrefs().then((h) => {
      if (!cancelled) {
        setDisplayNameState(h.displayName);
        setWorkoutsPerWeekState(h.workoutsPerWeek);
        setActivityLevelState(h.activityLevel);
        setDailyCalorieGoalState(h.dailyCalorieGoal);
        setOnboardingCompleteState(h.onboardingComplete);
        setPrefsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    const t = name.trim();
    if (t.length === 0) {
      return;
    }
    await saveDisplayName(t);
    setDisplayNameState(t);
  }, []);

  const setWorkoutsPerWeek = useCallback(async (n: number) => {
    const clamped = Math.min(7, Math.max(1, Math.round(n)));
    const prev = await loadProfilePrefs();
    const next: ProfilePrefs = {
      workoutsPerWeek: clamped,
      activityLevel: prev?.activityLevel ?? DEFAULT_PROFILE_PREFS.activityLevel,
      dailyCalorieGoal:
        prev?.dailyCalorieGoal ?? DEFAULT_PROFILE_PREFS.dailyCalorieGoal,
    };
    await saveProfilePrefs(next);
    setWorkoutsPerWeekState(clamped);
    setActivityLevelState(next.activityLevel);
    setDailyCalorieGoalState(next.dailyCalorieGoal);
  }, []);

  const setActivityLevel = useCallback(async (level: ActivityLevel) => {
    const prev = await loadProfilePrefs();
    const next: ProfilePrefs = {
      workoutsPerWeek:
        prev?.workoutsPerWeek ?? DEFAULT_PROFILE_PREFS.workoutsPerWeek,
      activityLevel: level,
      dailyCalorieGoal:
        prev?.dailyCalorieGoal ?? DEFAULT_PROFILE_PREFS.dailyCalorieGoal,
    };
    await saveProfilePrefs(next);
    setActivityLevelState(level);
    setWorkoutsPerWeekState(next.workoutsPerWeek);
    setDailyCalorieGoalState(next.dailyCalorieGoal);
  }, []);

  const setDailyCalorieGoal = useCallback(async (calories: number) => {
    const clamped = Math.min(20000, Math.max(800, Math.round(calories)));
    const prev = await loadProfilePrefs();
    const next: ProfilePrefs = {
      workoutsPerWeek:
        prev?.workoutsPerWeek ?? DEFAULT_PROFILE_PREFS.workoutsPerWeek,
      activityLevel: prev?.activityLevel ?? DEFAULT_PROFILE_PREFS.activityLevel,
      dailyCalorieGoal: clamped,
    };
    await saveProfilePrefs(next);
    setDailyCalorieGoalState(clamped);
    setWorkoutsPerWeekState(next.workoutsPerWeek);
    setActivityLevelState(next.activityLevel);
  }, []);

  const updateProfilePrefs = useCallback(async (partial: Partial<ProfilePrefs>) => {
    const prev = await loadProfilePrefs();
    const base = prev ?? DEFAULT_PROFILE_PREFS;
    const next: ProfilePrefs = {
      workoutsPerWeek: Math.min(
        7,
        Math.max(1, Math.round(partial.workoutsPerWeek ?? base.workoutsPerWeek)),
      ),
      activityLevel: partial.activityLevel ?? base.activityLevel,
      dailyCalorieGoal: Math.min(
        20000,
        Math.max(
          800,
          Math.round(partial.dailyCalorieGoal ?? base.dailyCalorieGoal),
        ),
      ),
    };
    await saveProfilePrefs(next);
    setWorkoutsPerWeekState(next.workoutsPerWeek);
    setActivityLevelState(next.activityLevel);
    setDailyCalorieGoalState(next.dailyCalorieGoal);
  }, []);

  const setOnboardingComplete = useCallback(async (complete: boolean) => {
    await saveOnboardingComplete(complete);
    setOnboardingCompleteState(complete);
  }, []);

  const value = useMemo(
    () => ({
      displayName,
      workoutsPerWeek,
      activityLevel,
      dailyCalorieGoal,
      onboardingComplete,
      prefsLoaded,
      setDisplayName,
      setWorkoutsPerWeek,
      setActivityLevel,
      setDailyCalorieGoal,
      updateProfilePrefs,
      setOnboardingComplete,
      refreshFromStorage,
    }),
    [
      displayName,
      workoutsPerWeek,
      activityLevel,
      dailyCalorieGoal,
      onboardingComplete,
      prefsLoaded,
      setDisplayName,
      setWorkoutsPerWeek,
      setActivityLevel,
      setDailyCalorieGoal,
      updateProfilePrefs,
      setOnboardingComplete,
      refreshFromStorage,
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
