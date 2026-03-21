import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
      <Text style={styles.hint}>
        {locked
          ? 'Locked for today after you saved a weight. It will unlock tomorrow.'
          : 'Pounds (lb). Enter a number and tap done — it saves with your day.'}
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
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
  },
});
