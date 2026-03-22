import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { V } from '../constants/vinlandTheme';
import type { ExerciseDefinition } from '../types';
import { exerciseSummaryLines } from '../utils/workouts';

type TaskItemProps = {
  name: string;
  completed: boolean;
  onToggle: () => void;
  exercise?: ExerciseDefinition;
  /** When true, row is visible but not tappable (e.g. workout not started). */
  disabled?: boolean;
};

export function TaskItem({
  name,
  completed,
  onToggle,
  exercise,
  disabled = false,
}: TaskItemProps) {
  const detailLines = exercise ? exerciseSummaryLines(exercise) : [];

  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        completed && styles.rowCompleted,
        disabled && styles.rowDisabled,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed, disabled }}
    >
      <View style={[styles.checkbox, completed && styles.checkboxOn]}>
        {completed ? (
          <Text style={styles.checkboxMark} accessibilityLabel="Checked">
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, completed && styles.labelDone]}>
          {name}
          {exercise?.optional ? (
            <Text style={styles.optionalInline}> · Optional</Text>
          ) : null}
        </Text>
        {exercise?.optional ? (
          <Text style={styles.optionalMeta}>
            Excluded from daily progress and stats
          </Text>
        ) : null}
        {detailLines.length > 0 ? (
          <View style={styles.detailBlock}>
            {detailLines.map((line, i) => (
              <Text
                key={i}
                style={[styles.detailLine, completed && styles.detailLineDone]}
              >
                {line}
              </Text>
            ))}
          </View>
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
  rowDisabled: {
    opacity: 0.45,
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
    borderColor: V.accent,
    backgroundColor: 'transparent',
  },
  checkboxMark: {
    color: V.accent,
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
  optionalInline: {
    fontSize: 15,
    fontWeight: '500',
    color: V.textTertiary,
  },
  optionalMeta: {
    fontSize: 12,
    color: V.textDim,
    marginTop: 4,
    marginBottom: 2,
    lineHeight: 16,
  },
  detailBlock: {
    marginTop: 6,
  },
  detailLine: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
  },
  detailLineDone: {
    color: V.textDim,
  },
});
