import React from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { V, switchThumb, switchTrack } from '../constants/vinlandTheme';
import type { ExerciseFormInput } from '../types';

type Props = {
  index: number;
  value: ExerciseFormInput;
  onChange: (next: ExerciseFormInput) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export function ExerciseEditorCard({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const update = (patch: Partial<ExerciseFormInput>) => {
    onChange({ ...value, ...patch });
  };

  const setTimeBased = (timeBased: boolean) => {
    if (timeBased) {
      onChange({
        ...value,
        timeBased: true,
        repsStr: '',
        phases:
          value.phases.length > 0
            ? value.phases
            : [{ label: '', minutesStr: '' }],
      });
    } else {
      onChange({
        ...value,
        timeBased: false,
        phases: [],
        restMinutesStr: '',
        repsStr: value.repsStr || '10',
      });
    }
  };

  const addPhase = () => {
    update({
      phases: [...value.phases, { label: '', minutesStr: '' }],
    });
  };

  const updatePhase = (
    phaseIndex: number,
    patch: Partial<{ label: string; minutesStr: string }>,
  ) => {
    const phases = value.phases.map((p, i) =>
      i === phaseIndex ? { ...p, ...patch } : p,
    );
    update({ phases });
  };

  const removePhase = (phaseIndex: number) => {
    update({ phases: value.phases.filter((_, i) => i !== phaseIndex) });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Exercise {index + 1}</Text>
        {canRemove ? (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={styles.removeTop}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        value={value.name}
        onChangeText={(name) => update({ name })}
        placeholder="Bench Press"
        placeholderTextColor={V.placeholder}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Sets</Text>
      <TextInput
        value={value.setsStr}
        onChangeText={(setsStr) => update({ setsStr })}
        placeholder="4"
        placeholderTextColor={V.placeholder}
        keyboardType="number-pad"
        style={styles.input}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Time-based (no reps)</Text>
        <Switch
          value={value.timeBased}
          onValueChange={setTimeBased}
          trackColor={switchTrack}
          thumbColor={value.timeBased ? switchThumb.on : switchThumb.off}
        />
      </View>

      {!value.timeBased ? (
        <>
          <Text style={styles.fieldLabel}>Reps per set</Text>
          <TextInput
            value={value.repsStr}
            onChangeText={(repsStr) => update({ repsStr })}
            placeholder="10"
            placeholderTextColor={V.placeholder}
            keyboardType="number-pad"
            style={styles.input}
          />
        </>
      ) : (
        <>
          <Text style={styles.sectionHint}>
            Add one or more working blocks (label + minutes). Example: Hard 4,
            Light 3.
          </Text>
          {value.phases.map((phase, pi) => (
            <View key={pi} style={styles.phaseBlock}>
              <View style={styles.phaseHeader}>
                <Text style={styles.phaseLabel}>Working block {pi + 1}</Text>
                {value.phases.length > 1 ? (
                  <Pressable onPress={() => removePhase(pi)} hitSlop={8}>
                    <Text style={styles.removePhase}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={phase.label}
                onChangeText={(label) => updatePhase(pi, { label })}
                placeholder="Label (e.g. Hard, Light)"
                placeholderTextColor={V.placeholder}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Minutes</Text>
              <TextInput
                value={phase.minutesStr}
                onChangeText={(minutesStr) => updatePhase(pi, { minutesStr })}
                placeholder="4"
                placeholderTextColor={V.placeholder}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          ))}
          <Pressable
            onPress={addPhase}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>+ Add working block</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Rest between sets (minutes)</Text>
          <TextInput
            value={value.restMinutesStr}
            onChangeText={(restMinutesStr) => update({ restMinutesStr })}
            placeholder="3"
            placeholderTextColor={V.placeholder}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.restHint}>
            Optional. Applied after each full round of the working blocks above.
          </Text>
        </>
      )}

      <Text style={styles.fieldLabel}>Notes (optional)</Text>
      <TextInput
        value={value.notesStr}
        onChangeText={(notesStr) => update({ notesStr })}
        placeholder="e.g. 70 – 75% effort"
        placeholderTextColor={V.placeholder}
        style={styles.notesInput}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: V.text,
  },
  removeTop: {
    color: V.destructive,
    fontSize: 16,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: V.textTertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 14,
  },
  notesInput: {
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    borderRadius: V.boxRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: V.text,
    backgroundColor: V.bgInput,
    marginBottom: 0,
    minHeight: 72,
    lineHeight: 21,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    color: V.text,
    paddingRight: 12,
  },
  sectionHint: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  phaseBlock: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V.borderHairline,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: V.textSecondary,
  },
  removePhase: {
    color: V.destructive,
    fontSize: 14,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  secondaryBtnText: {
    color: V.link,
    fontSize: 16,
    fontWeight: '600',
  },
  restHint: {
    fontSize: 13,
    color: V.textSecondary,
    marginTop: -8,
    marginBottom: 4,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.8,
  },
});
