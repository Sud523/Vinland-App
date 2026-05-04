/**
 * Supabase browser/client bundle for Expo (not Vite).
 *
 * Uses process.env.EXPO_PUBLIC_* — Expo does not load VITE_SUPABASE_* or import.meta.env.
 * Prefer EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new dashboard keys) or EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  '';

/**
 * False when env vars were missing at bundle time (e.g. GitHub Pages export without secrets).
 * Never throw during import — a missing config would otherwise white-screen the web app.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Placeholder URL/key only used when misconfigured so createClient never throws at load time. */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDYyMzkwMjIsImV4cCI6MTk2MTgxNTAyMn0.invalid';

function createSupabase(): SupabaseClient {
  const url = isSupabaseConfigured ? supabaseUrl : PLACEHOLDER_URL;
  const key = isSupabaseConfigured ? supabaseKey : PLACEHOLDER_KEY;

  return createSupabaseJsClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export const supabase = createSupabase();
