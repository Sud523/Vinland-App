/**
 * Email/password sign-in and sign-up gate shown until the user has a Supabase session.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { V } from '../constants/vinlandTheme';
import { VinlandButton } from '../components/ui/VinlandButton';
import { VinlandInput } from '../components/ui/VinlandInput';
import { VinlandCard } from '../components/ui/VinlandCard';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    const em = email.trim();
    if (em.length === 0 || password.length < 6 || busy) {
      setMessage('Use your email and a password with at least 6 characters.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fn = mode === 'signIn' ? signInWithEmail : signUpWithEmail;
      const { error } = await fn(em, password);
      if (error) {
        setMessage(error.message);
      } else if (mode === 'signUp') {
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } finally {
      setBusy(false);
    }
  }, [email, password, busy, mode, signInWithEmail, signUpWithEmail]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Text style={styles.title}>Vinland</Text>
          <Text style={styles.sub}>Sign in to save your journal and workouts everywhere you use Vinland.</Text>

          <VinlandCard padded style={styles.card}>
            <VinlandInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
              containerStyle={styles.field}
            />

            <VinlandInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              editable={!busy}
              containerStyle={styles.field}
            />

            {message ? <Text style={styles.msg}>{message}</Text> : null}

            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={V.runeGlow} />
                <Text style={styles.busyText}>Working…</Text>
              </View>
            ) : null}

            <VinlandButton
              title={mode === 'signIn' ? 'Sign in' : 'Create account'}
              onPress={() => void onSubmit()}
              disabled={busy}
              variant="primary"
            />

          <Pressable
            onPress={() => {
              setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
              setMessage(null);
            }}
            disabled={busy}
            style={styles.switch}>
            <Text style={styles.switchText}>
              {mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
          </VinlandCard>
        </View>
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
  inner: {
    flex: 1,
    paddingHorizontal: V.space.xl,
    paddingTop: V.space.xl,
    justifyContent: 'center',
  },
  card: {
    marginTop: V.space.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: V.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: V.space.lg,
    lineHeight: 22,
  },
  field: { marginBottom: V.space.md },
  msg: {
    fontSize: 14,
    color: V.destructive,
    marginBottom: V.space.sm,
    lineHeight: 18,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: V.space.md,
  },
  busyText: { color: V.textSecondary, fontSize: 14, fontWeight: '400' },
  switch: {
    marginTop: V.space.lg,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 15,
    color: V.link,
  },
});
