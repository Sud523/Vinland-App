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
      setMessage('Enter email and a password of at least 6 characters.');
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
        setMessage('Check your email to confirm, or sign in if confirmations are disabled.');
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
          <Text style={styles.sub}>Sign in to sync your journal across devices.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={V.placeholder}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={V.placeholder}
            style={styles.input}
            secureTextEntry
            editable={!busy}
          />

          {message ? <Text style={styles.msg}>{message}</Text> : null}

          <Pressable
            onPress={() => void onSubmit()}
            disabled={busy}
            style={({ pressed }) => [
              styles.btn,
              busy && styles.btnDisabled,
              pressed && !busy && styles.btnPressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={V.bg} />
            ) : (
              <Text style={styles.btnText}>{mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>
            )}
          </Pressable>

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
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: V.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: V.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: V.borderMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: V.text,
    marginBottom: 16,
    backgroundColor: V.bgInput,
  },
  msg: {
    fontSize: 14,
    color: V.streakFlame,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: V.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: V.bg,
  },
  switch: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 15,
    color: V.accent,
  },
});
