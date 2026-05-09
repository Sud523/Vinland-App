/**
 * Blocks the main app until profile prefs are loaded and optional AsyncStorage → Supabase migration finishes.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useUserPrefs } from '../context/UserPrefsContext';
import { V } from '../constants/vinlandTheme';
import { migrateLocalToRemote } from '../utils/migrateLocalToSupabase';
import { supabase } from '../utils/supabase';

export function LocalDataMigrationGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { prefsLoaded, refreshFromProfile, markLocalDataMigrated } = useUserPrefs();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!prefsLoaded || user == null) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data: row } = await supabase
        .from('profiles')
        .select('local_data_migrated_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      const already = row?.local_data_migrated_at != null;
      if (!already) {
        try {
          await migrateLocalToRemote(user.id);
          await markLocalDataMigrated();
          await refreshFromProfile();
        } catch {
          //
        }
      }

      if (!cancelled) {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prefsLoaded, user, markLocalDataMigrated, refreshFromProfile]);

  if (!prefsLoaded || !ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={V.runeGlow} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: V.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
