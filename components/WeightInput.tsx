import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type WeightInputProps = {
  weight?: number;
  onWeightChange: (weight: number | undefined) => void;
};

export function WeightInput({ weight, onWeightChange }: WeightInputProps) {
  const [text, setText] = useState(weight != null ? String(weight) : '');

  useEffect(() => {
    setText(weight != null ? String(weight) : '');
  }, [weight]);

  const commit = () => {
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
      <Text style={styles.label}>Today&apos;s weight</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholder="e.g. 185.4"
        placeholderTextColor="#C7C7CC"
        keyboardType="decimal-pad"
        returnKeyType="done"
        style={styles.input}
      />
      <Text style={styles.hint}>Enter a number and tap done — it saves with your day.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});
