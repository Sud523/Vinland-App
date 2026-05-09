/**
 * Labeled block with Vinland checkbox styling (nutrition rows on Home).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { V } from '../constants/vinlandTheme';

type Props = {
  title: string;
  subtitle?: string;
  checked: boolean;
  /** When true, tapping does nothing (locked checked state). */
  disabled?: boolean;
  onToggle: () => void;
};

/** Same row + checkbox styling as exercise `TaskItem` rows on Home. */
export function NutritionCheckRow({
  title,
  subtitle,
  checked,
  disabled = false,
  onToggle,
}: Props) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) {
          return;
        }
        onToggle();
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        checked && styles.rowCompleted,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? (
          <Text style={styles.checkboxMark} accessibilityLabel="Checked">
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, checked && styles.labelDone]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, checked && styles.subtitleDone]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    backgroundColor: V.bgElevated,
    marginBottom: 10,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowCompleted: {
    backgroundColor: V.surfaceComplete,
    borderColor: V.borderHairline,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.textSecondary,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {
    borderColor: V.runeGlow,
    backgroundColor: 'transparent',
  },
  checkboxMark: {
    color: V.runeGlow,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: -1,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    color: V.text,
    letterSpacing: -0.24,
    fontWeight: '600',
  },
  labelDone: {
    textDecorationLine: 'line-through',
    color: V.textTertiary,
  },
  subtitle: {
    fontSize: 14,
    color: V.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  subtitleDone: {
    color: V.textDim,
  },
});
