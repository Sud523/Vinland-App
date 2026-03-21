import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TaskItemProps = {
  name: string;
  completed: boolean;
  onToggle: () => void;
};

export function TaskItem({ name, completed, onToggle }: TaskItemProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        completed && styles.rowCompleted,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
    >
      <View style={[styles.checkbox, completed && styles.checkboxOn]} />
      <Text style={[styles.label, completed && styles.labelDone]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginBottom: 10,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowCompleted: {
    backgroundColor: '#E8E8ED',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8E8E93',
    marginRight: 12,
  },
  checkboxOn: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  label: {
    flex: 1,
    fontSize: 17,
    color: '#1C1C1E',
    letterSpacing: -0.24,
  },
  labelDone: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
});
