import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { V } from '../constants/vinlandTheme';

type Props = {
  onPress: () => void;
  /** e.g. "Workouts" when returning to the workouts list */
  label?: string;
  /** Extra wrapper style (e.g. header margin) */
  containerStyle?: StyleProp<ViewStyle>;
  /** Smaller control, tuned for iOS nav bar next to a 17pt left title */
  compact?: boolean;
};

/**
 * Square outlined control. On iOS 26+, pair with `unstable_header*Items` + `hidesSharedBackground`
 * (and/or `UIDesignRequiresCompatibility` in app config) so the system does not add a glass pill.
 */
export function OutlinedNavBackButton({ onPress, label, containerStyle, compact }: Props) {
  const iconSize = compact ? 17 : 22;
  const boxStyle = [
    styles.box,
    label == null && styles.boxIconOnly,
    compact && styles.boxCompact,
    compact && label == null && styles.boxIconOnlyCompact,
  ];
  const labelStyle = [styles.label, compact && styles.labelCompact];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label != null ? `Back to ${label}` : 'Go back'}
      hitSlop={
        compact
          ? { top: 8, bottom: 8, left: 4, right: 8 }
          : { top: 10, bottom: 10, left: 6, right: 10 }
      }
      style={[styles.touchOuter, containerStyle]}
    >
      <View style={boxStyle}>
        <Ionicons name="chevron-back" size={iconSize} color={V.link} />
        {label != null ? <Text style={labelStyle}>{label}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchOuter: {
    alignSelf: 'flex-start',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: V.outlineWidth,
    borderColor: V.border,
    backgroundColor: V.bgElevated,
    borderRadius: V.boxRadius,
  },
  boxCompact: {
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  boxIconOnly: {
    paddingHorizontal: 10,
  },
  boxIconOnlyCompact: {
    paddingHorizontal: 7,
    minWidth: 34,
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: V.link,
  },
  labelCompact: {
    fontSize: 15,
    fontWeight: '600',
  },
});
