/**
 * Supabase browser/client bundle for Expo (not Vite).
 *
 * Uses process.env.EXPO_PUBLIC_* — Expo does not load VITE_SUPABASE_* or import.meta.env.
 * Prefer EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new dashboard keys) or EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function createSupabase(): SupabaseClient {
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
    );
  }

  return createSupabaseJsClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export const supabase = createSupabase();
