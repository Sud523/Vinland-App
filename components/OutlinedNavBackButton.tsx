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
};

/**
 * Square outlined control. On iOS 26+, pair with `unstable_header*Items` + `hidesSharedBackground`
 * (and/or `UIDesignRequiresCompatibility` in app config) so the system does not add a glass pill.
 */
export function OutlinedNavBackButton({ onPress, label, containerStyle }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label != null ? `Back to ${label}` : 'Go back'}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
      style={[styles.touchOuter, containerStyle]}
    >
      <View style={[styles.box, label == null && styles.boxIconOnly]}>
        <Ionicons name="chevron-back" size={22} color={V.link} />
        {label != null ? <Text style={styles.label}>{label}</Text> : null}
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
  boxIconOnly: {
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: V.link,
  },
});
