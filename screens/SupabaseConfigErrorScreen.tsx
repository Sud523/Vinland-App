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
        <Text style={styles.title}>Configuration missing</Text>
        <Text style={styles.body}>
          This build does not include Supabase credentials. The web bundle needs{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_URL</Text> and{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Text> (or{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>) at{' '}
          <Text style={styles.em}>build time</Text>, not only on your machine after deploy.
        </Text>
        <Text style={styles.section}>Fix locally</Text>
        <Text style={styles.body}>
          Copy <Text style={styles.mono}>.env.example</Text> to <Text style={styles.mono}>.env</Text>,
          add your project URL and anon/publishable key, then run:
        </Text>
        <Text style={styles.code}>npm run export:docs</Text>
        <Text style={styles.body}>Commit the updated <Text style={styles.mono}>docs/</Text> folder.</Text>
        <Text style={styles.section}>Fix on GitHub Actions</Text>
        <Text style={styles.body}>
          Add repository secrets for the same variables and pass them into the job environment before{' '}
          <Text style={styles.mono}>expo export</Text>, so they are inlined into the JS bundle.
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
