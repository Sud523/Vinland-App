import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Day } from '../types';

const STORAGE_KEY = '@vinland_days';

export async function saveData(days: Day[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(days));
}

export async function loadData(): Promise<Day[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Day[]) : [];
  } catch {
    return [];
  }
}
