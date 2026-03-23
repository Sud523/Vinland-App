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
import type {
  CardioIntervalMeasure,
  CardioPattern,
  CircuitStationFormInput,
  ExerciseFormInput,
  ExerciseKind,
} from '../types';
import { emptyCircuitStationForm } from '../utils/workouts';

type Props = {
  index: number;
  value: ExerciseFormInput;
  onChange: (next: ExerciseFormInput) => void;
  onRemove: () => void;
  canRemove: boolean;
  /** Long-press to drag-reorder (workout form). */
  onDrag?: () => void;
  isDragging?: boolean;
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipOn : styles.chipIdle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function ExerciseEditorCard({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  onDrag,
  isDragging,
}: Props) {
  const update = (patch: Partial<ExerciseFormInput>) => {
    onChange({ ...value, ...patch });
  };

  const setKind = (kind: ExerciseKind) => {
    if (kind === 'weighted') {
    onChange({
      ...value,
      kind: 'weighted',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      distanceMilesStr: '',
      paceStr: '',
      distancePhases: [],
      circuitStations: [],
    });
      return;
    }
    if (kind === 'circuit') {
      onChange({
        ...value,
        kind: 'circuit',
        timeBased: false,
        phases: [],
        restMinutesStr: '',
        distancePhases: [],
        distanceMilesStr: '',
        paceStr: '',
        repsStr: '',
        repsUntilFailure: false,
        cardioPattern: 'interval',
        cardioIntervalMeasure: 'time',
        setsStr: value.setsStr || '3',
        circuitStations:
          value.circuitStations.length > 0
            ? value.circuitStations
            : [emptyCircuitStationForm()],
      });
      return;
    }
    onChange({
      ...value,
      kind: 'cardio',
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      timeBased: true,
      repsUntilFailure: false,
      repsStr: '',
      phases:
        value.phases.length > 0
          ? value.phases
          : [{ label: '', minutesStr: '' }],
      distancePhases: [],
      distanceMilesStr: '',
      paceStr: '',
      circuitStations: [],
    });
  };

  const setCardioPattern = (cardioPattern: CardioPattern) => {
    if (cardioPattern === 'steady_distance') {
      onChange({
        ...value,
        cardioPattern: 'steady_distance',
        timeBased: false,
        phases: [],
        restMinutesStr: '',
        repsUntilFailure: false,
        repsStr: '',
        distancePhases: [],
      });
      return;
    }
    onChange({
      ...value,
      cardioPattern: 'interval',
      cardioIntervalMeasure: 'time',
      timeBased: true,
      phases:
        value.phases.length > 0
          ? value.phases
          : [{ label: '', minutesStr: '' }],
      distanceMilesStr: '',
      paceStr: '',
      distancePhases: [],
    });
  };

  const setCardioIntervalMeasure = (cardioIntervalMeasure: CardioIntervalMeasure) => {
    if (cardioIntervalMeasure === 'time') {
      onChange({
        ...value,
        cardioIntervalMeasure: 'time',
        timeBased: true,
        phases:
          value.phases.length > 0
            ? value.phases
            : [{ label: '', minutesStr: '' }],
        distancePhases: [],
      });
      return;
    }
    onChange({
      ...value,
      cardioIntervalMeasure: 'distance',
      timeBased: false,
      phases: [],
      distancePhases:
        value.distancePhases.length > 0
          ? value.distancePhases
          : [{ label: '', milesStr: '' }],
    });
  };

  const setTimeBased = (timeBased: boolean) => {
    if (timeBased) {
      onChange({
        ...value,
        timeBased: true,
        repsUntilFailure: false,
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
        repsStr: value.repsUntilFailure ? '' : value.repsStr || '10',
        repsUntilFailure: value.repsUntilFailure,
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

  const addDistancePhase = () => {
    update({
      distancePhases: [...value.distancePhases, { label: '', milesStr: '' }],
    });
  };

  const updateDistancePhase = (
    phaseIndex: number,
    patch: Partial<{ label: string; milesStr: string }>,
  ) => {
    const distancePhases = value.distancePhases.map((p, i) =>
      i === phaseIndex ? { ...p, ...patch } : p,
    );
    update({ distancePhases });
  };

  const removeDistancePhase = (phaseIndex: number) => {
    update({
      distancePhases: value.distancePhases.filter((_, i) => i !== phaseIndex),
    });
  };

  const updateCircuitStation = (
    stationIndex: number,
    patch: Partial<CircuitStationFormInput>,
  ) => {
    const circuitStations = value.circuitStations.map((s, i) =>
      i === stationIndex ? { ...s, ...patch } : s,
    );
    update({ circuitStations });
  };

  const setStationTimeBased = (stationIndex: number, timeBased: boolean) => {
    const cur = value.circuitStations[stationIndex];
    if (!cur) {
      return;
    }
    if (timeBased) {
      updateCircuitStation(stationIndex, {
        timeBased: true,
        phases:
          cur.phases.length > 0 ? cur.phases : [{ label: '', minutesStr: '' }],
        repsUntilFailure: false,
        repsStr: '',
      });
    } else {
      updateCircuitStation(stationIndex, {
        timeBased: false,
        phases: [],
        repsStr: cur.repsUntilFailure ? '' : cur.repsStr || '10',
        repsUntilFailure: cur.repsUntilFailure,
      });
    }
  };

  const updateStationPhase = (
    stationIndex: number,
    phaseIndex: number,
    patch: Partial<{ label: string; minutesStr: string }>,
  ) => {
    const circuitStations = value.circuitStations.map((s, i) => {
      if (i !== stationIndex) {
        return s;
      }
      const phases = s.phases.map((p, j) =>
        j === phaseIndex ? { ...p, ...patch } : p,
      );
      return { ...s, phases };
    });
    update({ circuitStations });
  };

  const addStationPhase = (stationIndex: number) => {
    const circuitStations = value.circuitStations.map((s, i) =>
      i === stationIndex
        ? { ...s, phases: [...s.phases, { label: '', minutesStr: '' }] }
        : s,
    );
    update({ circuitStations });
  };

  const removeStationPhase = (stationIndex: number, phaseIndex: number) => {
    const circuitStations = value.circuitStations.map((s, i) => {
      if (i !== stationIndex) {
        return s;
      }
      return { ...s, phases: s.phases.filter((_, j) => j !== phaseIndex) };
    });
    update({ circuitStations });
  };

  const addCircuitStation = () => {
    update({
      circuitStations: [...value.circuitStations, emptyCircuitStationForm()],
    });
  };

  const removeCircuitStation = (stationIndex: number) => {
    update({
      circuitStations: value.circuitStations.filter((_, i) => i !== stationIndex),
    });
  };

  const showWeightedTimeSwitch = value.kind === 'weighted';

  const showRepFields = value.kind === 'weighted' && !value.timeBased;

  const showTimePhasesWeighted = value.kind === 'weighted' && value.timeBased;

  const showCircuitBuilder = value.kind === 'circuit';

  const showCardioSteady =
    value.kind === 'cardio' && value.cardioPattern === 'steady_distance';

  const showCardioIntervalTime =
    value.kind === 'cardio' &&
    value.cardioPattern === 'interval' &&
    value.cardioIntervalMeasure === 'time';

  const showCardioIntervalDistance =
    value.kind === 'cardio' &&
    value.cardioPattern === 'interval' &&
    value.cardioIntervalMeasure === 'distance';

  const showSets =
    !showCardioSteady &&
    !showCircuitBuilder &&
    (showCardioIntervalTime ||
      showCardioIntervalDistance ||
      showRepFields ||
      showTimePhasesWeighted);

  return (
    <View style={[styles.card, isDragging && styles.cardDragging]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderMain}>
          {onDrag ? (
            <Pressable
              onLongPress={onDrag}
              delayLongPress={180}
              disabled={isDragging}
              accessibilityRole="button"
              accessibilityLabel="Drag to reorder exercise"
              hitSlop={10}
              style={({ pressed }) => [styles.dragHandle, pressed && styles.pressed]}
            >
              <View style={styles.dragDashStack}>
                <View style={[styles.dragDash, { backgroundColor: V.textDim }]} />
                <View style={[styles.dragDash, { backgroundColor: V.textDim }]} />
                <View style={[styles.dragDash, { backgroundColor: V.textDim }]} />
              </View>
            </Pressable>
          ) : null}
          <Text
            style={[styles.cardTitle, onDrag ? styles.cardTitleFlex : undefined]}
            numberOfLines={1}
          >
            Exercise {index + 1}
          </Text>
        </View>
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
        placeholder="Bench press, run, etc."
        placeholderTextColor={V.placeholder}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Exercise type</Text>
      <View style={styles.chipRow}>
        <Chip
          label="Weighted"
          selected={value.kind === 'weighted'}
          onPress={() => setKind('weighted')}
        />
        <Chip
          label="Cardio"
          selected={value.kind === 'cardio'}
          onPress={() => setKind('cardio')}
        />
        <Chip
          label="Circuit"
          selected={value.kind === 'circuit'}
          onPress={() => setKind('circuit')}
        />
      </View>

      {value.kind === 'cardio' ? (
        <>
          <Text style={styles.fieldLabel}>Cardio format</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Interval"
              selected={value.cardioPattern === 'interval'}
              onPress={() => setCardioPattern('interval')}
            />
            <Chip
              label="Distance"
              selected={value.cardioPattern === 'steady_distance'}
              onPress={() => setCardioPattern('steady_distance')}
            />
          </View>
        </>
      ) : null}

      {value.kind === 'cardio' && value.cardioPattern === 'interval' ? (
        <>
          <Text style={styles.fieldLabel}>Interval measure</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Time based"
              selected={value.cardioIntervalMeasure === 'time'}
              onPress={() => setCardioIntervalMeasure('time')}
            />
            <Chip
              label="Distance based"
              selected={value.cardioIntervalMeasure === 'distance'}
              onPress={() => setCardioIntervalMeasure('distance')}
            />
          </View>
        </>
      ) : null}

      {showCircuitBuilder ? (
        <>
          <Text style={styles.sectionHint}>
            Name the whole circuit above, then add each move in order. Complete all stations
            for one round; repeat for the number of rounds.
          </Text>
          <Text style={styles.fieldLabel}>Rounds</Text>
          <TextInput
            value={value.setsStr}
            onChangeText={(setsStr) => update({ setsStr })}
            placeholder="3"
            placeholderTextColor={V.placeholder}
            keyboardType="number-pad"
            style={styles.input}
          />
          {value.circuitStations.map((station, si) => (
            <View key={si} style={styles.circuitStationCard}>
              <View style={styles.phaseHeader}>
                <Text style={styles.phaseLabel}>Station {si + 1}</Text>
                {value.circuitStations.length > 1 ? (
                  <Pressable onPress={() => removeCircuitStation(si)} hitSlop={8}>
                    <Text style={styles.removePhase}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>Exercise name</Text>
              <TextInput
                value={station.name}
                onChangeText={(name) => updateCircuitStation(si, { name })}
                placeholder="e.g. Kettlebell swing"
                placeholderTextColor={V.placeholder}
                style={styles.input}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Time-based (no reps)</Text>
                <Switch
                  value={station.timeBased}
                  onValueChange={(v) => setStationTimeBased(si, v)}
                  trackColor={switchTrack}
                  thumbColor={station.timeBased ? switchThumb.on : switchThumb.off}
                />
              </View>
              {!station.timeBased ? (
                <>
                  <Text style={styles.fieldLabel}>Reps</Text>
                  <View style={styles.repsModeRow}>
                    <Pressable
                      onPress={() => {
                        if (station.repsUntilFailure) {
                          updateCircuitStation(si, {
                            repsUntilFailure: false,
                            repsStr: station.repsStr || '10',
                          });
                        } else {
                          updateCircuitStation(si, {
                            repsUntilFailure: true,
                            repsStr: '',
                          });
                        }
                      }}
                      style={({ pressed }) => [
                        styles.failureChip,
                        station.repsUntilFailure && styles.failureChipOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.failureChipText,
                          station.repsUntilFailure && styles.failureChipTextOn,
                        ]}
                      >
                        Failure
                      </Text>
                    </Pressable>
                    <Text style={styles.repsModeHint}>
                      {station.repsUntilFailure
                        ? 'On: no rep target'
                        : 'Off: fixed reps below'}
                    </Text>
                  </View>
                  {station.repsUntilFailure ? (
                    <Text style={styles.failureDescription}>
                      This station is done to failure for the rep count.
                    </Text>
                  ) : (
                    <TextInput
                      value={station.repsStr}
                      onChangeText={(repsStr) => updateCircuitStation(si, { repsStr })}
                      placeholder="10"
                      placeholderTextColor={V.placeholder}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sectionHint}>
                    Working blocks for this station (label + minutes).
                  </Text>
                  {station.phases.map((phase, pi) => (
                    <View key={pi} style={styles.phaseBlock}>
                      <View style={styles.phaseHeader}>
                        <Text style={styles.phaseLabel}>Block {pi + 1}</Text>
                        {station.phases.length > 1 ? (
                          <Pressable
                            onPress={() => removeStationPhase(si, pi)}
                            hitSlop={8}
                          >
                            <Text style={styles.removePhase}>Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <TextInput
                        value={phase.label}
                        onChangeText={(label) => updateStationPhase(si, pi, { label })}
                        placeholder="Label"
                        placeholderTextColor={V.placeholder}
                        style={styles.input}
                      />
                      <Text style={styles.fieldLabel}>Minutes</Text>
                      <TextInput
                        value={phase.minutesStr}
                        onChangeText={(minutesStr) =>
                          updateStationPhase(si, pi, { minutesStr })
                        }
                        placeholder="4"
                        placeholderTextColor={V.placeholder}
                        keyboardType="decimal-pad"
                        style={styles.input}
                      />
                    </View>
                  ))}
                  <Pressable
                    onPress={() => addStationPhase(si)}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryBtnText}>+ Add time block</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
          <Pressable
            onPress={addCircuitStation}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>+ Add station to circuit</Text>
          </Pressable>
        </>
      ) : null}

      {showCardioSteady ? (
        <>
          <Text style={styles.fieldLabel}>Distance (miles)</Text>
          <TextInput
            value={value.distanceMilesStr}
            onChangeText={(distanceMilesStr) => update({ distanceMilesStr })}
            placeholder="e.g. 3.1"
            placeholderTextColor={V.placeholder}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Pace (optional)</Text>
          <TextInput
            value={value.paceStr}
            onChangeText={(paceStr) => update({ paceStr })}
            placeholder="e.g. 8:30 / mi"
            placeholderTextColor={V.placeholder}
            style={styles.input}
          />
          <Text style={styles.sectionHint}>
            Steady cardio: no sets. Won&apos;t appear on the Timer tab.
          </Text>
        </>
      ) : null}

      {showSets ? (
        <>
          <Text style={styles.fieldLabel}>Sets</Text>
          <TextInput
            value={value.setsStr}
            onChangeText={(setsStr) => update({ setsStr })}
            placeholder="4"
            placeholderTextColor={V.placeholder}
            keyboardType="number-pad"
            style={styles.input}
          />
        </>
      ) : null}

      {showWeightedTimeSwitch ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Time-based (no reps)</Text>
          <Switch
            value={value.timeBased}
            onValueChange={setTimeBased}
            trackColor={switchTrack}
            thumbColor={value.timeBased ? switchThumb.on : switchThumb.off}
          />
        </View>
      ) : null}

      {showRepFields ? (
        <>
          <Text style={styles.fieldLabel}>Reps per set</Text>
          <View style={styles.repsModeRow}>
            <Pressable
              onPress={() => {
                if (value.repsUntilFailure) {
                  update({ repsUntilFailure: false, repsStr: value.repsStr || '10' });
                } else {
                  update({ repsUntilFailure: true, repsStr: '' });
                }
              }}
              style={({ pressed }) => [
                styles.failureChip,
                value.repsUntilFailure && styles.failureChipOn,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.failureChipText,
                  value.repsUntilFailure && styles.failureChipTextOn,
                ]}
              >
                Failure
              </Text>
            </Pressable>
            <Text style={styles.repsModeHint}>
              {value.repsUntilFailure
                ? 'On: no rep target'
                : 'Off: fixed reps below'}
            </Text>
          </View>
          {value.repsUntilFailure ? (
            <Text style={styles.failureDescription}>
              Each set is done to muscular failure instead of a set number of reps.
            </Text>
          ) : (
            <TextInput
              value={value.repsStr}
              onChangeText={(repsStr) => update({ repsStr })}
              placeholder="10"
              placeholderTextColor={V.placeholder}
              keyboardType="number-pad"
              style={styles.input}
            />
          )}
        </>
      ) : null}

      {showTimePhasesWeighted || showCardioIntervalTime ? (
        <>
          <Text style={styles.sectionHint}>
            Add one or more working blocks (label + minutes). Example: Hard 4, Light 3.
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
      ) : null}

      {showCardioIntervalDistance ? (
        <>
          <Text style={styles.sectionHint}>
            Distance for each part of one interval round (miles). Same structure as timed
            intervals, but no Timer tab.
          </Text>
          {value.distancePhases.map((phase, pi) => (
            <View key={pi} style={styles.phaseBlock}>
              <View style={styles.phaseHeader}>
                <Text style={styles.phaseLabel}>Distance block {pi + 1}</Text>
                {value.distancePhases.length > 1 ? (
                  <Pressable onPress={() => removeDistancePhase(pi)} hitSlop={8}>
                    <Text style={styles.removePhase}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={phase.label}
                onChangeText={(label) => updateDistancePhase(pi, { label })}
                placeholder="Label (e.g. Hard, Easy)"
                placeholderTextColor={V.placeholder}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Miles</Text>
              <TextInput
                value={phase.milesStr}
                onChangeText={(milesStr) => updateDistancePhase(pi, { milesStr })}
                placeholder="0.25"
                placeholderTextColor={V.placeholder}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          ))}
          <Pressable
            onPress={addDistancePhase}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>+ Add distance block</Text>
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
            Optional. After each full round of the distance blocks above.
          </Text>
        </>
      ) : null}

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

      <View style={styles.optionalRow}>
        <Pressable
          onPress={() => update({ optional: !value.optional })}
          style={({ pressed }) => [
            styles.optionalCheckbox,
            value.optional && styles.optionalCheckboxOn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value.optional }}
        >
          {value.optional ? (
            <Text style={styles.optionalCheckMark}>✓</Text>
          ) : null}
        </Pressable>
        <View style={styles.optionalTextCol}>
          <Text style={styles.optionalTitle}>Optional exercise</Text>
          <Text style={styles.optionalSub}>
            Skipped for today’s progress bar, streak, and Stats completion counts.
          </Text>
        </View>
      </View>
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
  cardDragging: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  dragHandle: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  dragDashStack: {
    gap: 4,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  dragDash: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: V.text,
  },
  cardTitleFlex: {
    flex: 1,
    minWidth: 0,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: V.boxRadius,
    backgroundColor: V.bgInput,
  },
  chipOn: {
    borderColor: V.border,
    backgroundColor: V.bgElevated,
  },
  chipIdle: {},
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: V.textSecondary,
  },
  chipTextOn: {
    color: V.accent,
  },
  circuitStationCard: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    borderRadius: V.boxRadius,
    padding: 14,
    marginBottom: 14,
    backgroundColor: V.bgInput,
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
    marginBottom: 14,
    minHeight: 72,
    lineHeight: 21,
  },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V.borderHairline,
    marginTop: 4,
  },
  optionalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: V.boxRadius,
    borderWidth: V.outlineWidth,
    borderColor: V.textSecondary,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: V.bgInput,
  },
  optionalCheckboxOn: {
    borderColor: V.accent,
  },
  optionalCheckMark: {
    color: V.accent,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  optionalTextCol: {
    flex: 1,
    minWidth: 0,
  },
  optionalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: V.text,
    marginBottom: 4,
  },
  optionalSub: {
    fontSize: 13,
    color: V.textSecondary,
    lineHeight: 18,
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
  repsModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  failureChip: {
    borderWidth: V.outlineWidth,
    borderColor: V.borderMuted,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: V.boxRadius,
    backgroundColor: V.bgInput,
  },
  failureChipOn: {
    borderColor: V.border,
    backgroundColor: V.bgElevated,
  },
  failureChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: V.textSecondary,
  },
  failureChipTextOn: {
    color: V.accent,
  },
  repsModeHint: {
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    color: V.textTertiary,
    lineHeight: 18,
  },
  failureDescription: {
    fontSize: 14,
    color: V.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
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
