/**
 * Shown when EXPO_PUBLIC_SUPABASE_* were not available at web export time
 * (common on GitHub Pages if the static build ran without env vars).
 */
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { V } from '../constants/vinlandTheme';

export default function SupabaseConfigErrorScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>App isn’t connected yet</Text>
        <Text style={styles.body}>
          This version was built without login settings, so Vinland can’t reach your account
          server. The web build needs your project URL and key baked in when the site is
          built—not added only after deploy.
        </Text>
        <Text style={styles.section}>If you’re developing locally</Text>
        <Text style={styles.body}>
          Copy <Text style={styles.mono}>.env.example</Text> to <Text style={styles.mono}>.env</Text>,
          add <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_URL</Text> and{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Text> (or{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>), then run:
        </Text>
        <Text style={styles.code}>npm run export:docs</Text>
        <Text style={styles.body}>Commit the updated <Text style={styles.mono}>docs/</Text> folder.</Text>
        <Text style={styles.section}>If you deploy with GitHub Actions</Text>
        <Text style={styles.body}>
          Add those same values as repository secrets and load them into the environment before{' '}
          <Text style={styles.mono}>expo export</Text> runs so they end up inside the JavaScript bundle.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: V.bg,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: V.text,
    marginBottom: 16,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: V.accent,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: V.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  em: {
    fontWeight: '600',
    color: V.text,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: V.text,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: V.bg,
    backgroundColor: V.textSecondary,
    padding: 12,
    marginVertical: 12,
    overflow: 'hidden',
  },
});
