import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { V } from '../constants/vinlandTheme';

type WeightInputProps = {
  weight?: number;
  onWeightChange: (weight: number | undefined) => void;
  /** After a weight is saved for this day, it cannot be edited until tomorrow. */
  locked?: boolean;
};

export function WeightInput({ weight, onWeightChange, locked = false }: WeightInputProps) {
  const [text, setText] = useState(weight != null ? String(weight) : '');

  useEffect(() => {
    setText(weight != null ? String(weight) : '');
  }, [weight]);

  const commit = () => {
    if (locked) {
      return;
    }
    const trimmed = text.trim();
    if (trimmed === '') {
      onWeightChange(undefined);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) {
      onWeightChange(undefined);
      return;
    }
    onWeightChange(n);
  };

  const handleDonePress = () => {
    if (locked) {
      return;
    }
    commit();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Today&apos;s weight (lb)</Text>
      <TextInput
        value={text}
        onChangeText={locked ? undefined : setText}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholder="e.g. 185.4"
        placeholderTextColor={V.placeholder}
        keyboardType="decimal-pad"
        returnKeyType="done"
        editable={!locked}
        style={[styles.input, locked && styles.inputLocked]}
      />
      <View style={styles.doneRow}>
        {locked ? (
          <Text style={styles.savedForTodayLabel}>Saved for today</Text>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Done entering weight"
            activeOpacity={0.88}
            onPress={handleDonePress}
            style={[styles.doneButton, Platform.OS === 'web' && styles.doneButtonWeb]}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.hint}>
        {locked
          ? 'Locked for today after you saved a weight. It will unlock tomorrow.'
          : 'Pounds (lb). Enter a number and tap Done — it saves with your day.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  input: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    color: V.text,
    backgroundColor: V.bgInput,
  },
  inputLocked: {
    borderColor: V.borderMuted,
    color: V.textSecondary,
    opacity: 0.9,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    minHeight: 44,
  },
  savedForTodayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: V.textSecondary,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  doneButton: {
    backgroundColor: V.accent,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    minWidth: 88,
    alignItems: 'center',
  },
  doneButtonWeb: {
    cursor: 'pointer',
  },
  doneButtonText: {
    color: V.bg,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
  },
});
